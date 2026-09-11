// Run through `npm run test:browser` after Playwright Chromium is installed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { computeWelfareTransferSeries } from '../src/curves/welfare-transfer/logic.js';

const url = 'http://127.0.0.1:4176/indifference-curve-app/';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4176', '--strictPort'],
  { stdio: 'pipe' }
);
let serverOutput = '';
server.stdout.on('data', data => { serverOutput += data; });
server.stderr.on('data', data => { serverOutput += data; });

let browser;
const artifacts = 'node_modules/.cache/welfare-rendering';
const traces = [];
const errors = [];

try {
  await mkdir(artifacts, { recursive: true });
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    if (attempt > 100) throw new Error(`Vite did not start: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.stack));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });

  await page.goto(url);
  await page.selectOption('#curve-select', 'welfare-transfer');

  async function snapshot() {
    await page.waitForTimeout(900);
    return page.evaluate(() => {
      const area = document.querySelector('.chart-area').__vueParentComponent;
      const chart = document.querySelector('.chart').__vueParentComponent;
      const state = area.parent.setupState;
      const instance = chart.exposed.chart.value;
      const display = instance.getZr().storage.getDisplayList();

      return JSON.parse(JSON.stringify({
        params: state.activeParams,
        meta: state.chartMeta,
        result: state.currentResult,
        chartOption: area.setupState.chartOption,
        rendered: instance.getOption().series,
        texts: display.filter(element => element.type === 'tspan').map(element => element.style.text),
        info: document.querySelector('.chart-header').textContent,
        pixels: document.querySelector('.chart canvas').toDataURL(),
      }));
    });
  }

  async function check(stage, overrides = {}) {
    const current = await snapshot();
    const expectedParams = {
      wageRate: 50,
      maxBenefit: 200,
      reductionRate: 0.5,
      ...overrides,
      stage,
    };
    const expected = computeWelfareTransferSeries({
      ...current.params,
      ...expectedParams,
    });

    assert.equal(current.params.stage, stage);
    for (const [key, value] of Object.entries(expectedParams)) assert.equal(current.params[key], value);
    assert.deepEqual(current.result, expected);
    assert.deepEqual(current.meta, expected.meta);

    const optionSeries = expected.series.map(({ meta, ...series }) => series);
    assert.deepEqual(current.chartOption.series, optionSeries);
    assert.equal(current.rendered.length, expected.series.length);
    current.rendered.forEach((series, index) => {
      assert.equal(series.type, expected.series[index].type);
      assert.deepEqual(
        series.data.map(point => point.value ?? point),
        expected.series[index].data.map(point => point.value ?? point)
      );
      for (const point of series.data) assert.ok((point.value ?? point).every(Number.isFinite));
    });

    assert.ok(current.texts.includes('A'));
    if (stage >= 2 && expected.meta.hasVisibleKink) assert.ok(current.texts.includes('K'));
    if (stage >= 3) assert.ok(current.texts.includes('B'));

    traces.push({ ...current, pixels: undefined });
    return current;
  }

  const stagePixels = new Set();
  for (const stage of [1, 2, 3]) {
    await page.locator('.stage-button').nth(stage - 1).click();
    const current = await check(stage);
    stagePixels.add(current.pixels);
    await page.screenshot({ path: `${artifacts}/stage-${stage}.png` });
  }
  assert.equal(stagePixels.size, 3, 'all three teaching stages should visibly differ');

  const defaults = (await snapshot()).meta;
  assert.deepEqual(defaults.baselinePoint, {
    leisure: 9,
    work: 7,
    earnedIncome: 350,
    benefit: 0,
    income: 450,
    utility: 4050,
  });
  assert.equal(defaults.phaseOutEarnedIncome, 400);
  assert.equal(defaults.phaseOutWork, 8);
  assert.deepEqual(defaults.kinkPoint, {
    leisure: 8,
    work: 8,
    earnedIncome: 400,
    benefit: 0,
    income: 500,
    utility: 4000,
  });
  assert.deepEqual(defaults.policyPoint, {
    leisure: 14,
    work: 2,
    earnedIncome: 100,
    benefit: 150,
    income: 350,
    utility: 4900,
  });
  assert.equal(defaults.workChange, -5);

  await page.locator('.stage-button').nth(1).click();
  await page.fill('#max-benefit', '0');
  let zeroTransfer = await check(2, { maxBenefit: 0 });
  const zeroBaseline = zeroTransfer.rendered.find(series => series.name === '无补贴预算线');
  const zeroPolicy = zeroTransfer.rendered.find(series => series.name === '福利计划预算约束');
  assert.deepEqual(zeroPolicy.data, zeroBaseline.data);

  await page.fill('#max-benefit', '200');
  await page.fill('#reduction-rate', '1');
  const fullReduction = await check(2, { reductionRate: 1 });
  assert.equal(fullReduction.meta.phaseOutWork, 4);
  assert.equal(fullReduction.meta.hasVisibleKink, true);

  await page.fill('#reduction-rate', '0');
  const noPhaseOut = await check(2, { reductionRate: 0 });
  assert.equal(noPhaseOut.meta.phaseOutEarnedIncome, null);
  assert.equal(noPhaseOut.meta.hasVisibleKink, false);
  assert.ok(!noPhaseOut.texts.includes('K'));

  await page.fill('#reduction-rate', '0.5');
  await page.locator('.stage-button').nth(2).click();
  const beforeWage = await check(3);
  await page.fill('#wage-rate', '60');
  const afterWage = await check(3, { wageRate: 60 });
  assert.notEqual(afterWage.pixels, beforeWage.pixels, 'wage changes should update the chart');

  await page.screenshot({ path: `${artifacts}/welfare-final.png` });
  assert.deepEqual(errors, [], 'browser console/runtime errors');
  console.log('PASS: welfare transfer stages, kink, zero-transfer, phase-out, and reactive wage updates render correctly.');
} finally {
  await writeFile(`${artifacts}/trace.json`, JSON.stringify({ traces, errors }, null, 2));
  await browser?.close();
  server.kill();
}
