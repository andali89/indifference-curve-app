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
    await page.waitForTimeout(700);
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

  async function validateCurrent() {
    const current = await snapshot();
    const expected = computeWelfareTransferSeries(current.params);
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

    traces.push({ ...current, pixels: undefined });
    return current;
  }

  let current = await validateCurrent();
  assert.equal(current.params.policyType, 'nail');
  assert.equal(current.params.nonLaborIncome, 100);
  assert.equal(current.meta.policyType, 'nail');
  assert.equal(current.meta.nonLaborIncome, 100);
  assert.equal(await page.locator('#non-labor-income').count(), 1, 'non-labor income should be adjustable');
  assert.equal(await page.locator('#reduction-rate').count(), 0, 'reduction rate should be hidden for nail welfare');

  const stagePixels = new Set();
  for (const stage of [1, 2, 3]) {
    await page.locator('.stage-button').nth(stage - 1).click();
    current = await validateCurrent();
    assert.equal(current.params.stage, stage);
    assert.ok(current.texts.includes('A'));
    if (stage >= 2) {
      assert.ok(current.texts.includes('C'));
      assert.ok(!current.texts.includes('K'));
    }
    if (stage >= 3) assert.ok(!current.texts.includes('B'));
    stagePixels.add(current.pixels);
    await page.screenshot({ path: `${artifacts}/nail-stage-${stage}.png` });
  }
  assert.equal(stagePixels.size, 3, 'all three nail teaching stages should visibly differ');

  current = await validateCurrent();
  assert.deepEqual(current.meta.baselinePoint, {
    leisure: 9,
    work: 7,
    earnedIncome: 350,
    benefit: 0,
    income: 450,
    utility: 4050,
  });
  assert.deepEqual(current.meta.nonworkPoint, {
    leisure: 16,
    work: 0,
    earnedIncome: 0,
    benefit: 200,
    income: 300,
    utility: 4800,
  });
  assert.equal(current.meta.participationChoice, 'nonwork');
  assert.equal(current.meta.workChange, -7);
  let cliff = current.rendered.find(series => series.name === '补贴断崖（示意）');
  assert.deepEqual(cliff.data.map(point => point.value ?? point), [[16, 100], [16, 300]]);
  assert.equal(cliff.lineStyle.type, 'dashed');

  await page.fill('#non-labor-income', '200');
  current = await validateCurrent();
  assert.equal(current.params.nonLaborIncome, 200);
  assert.equal(current.meta.nonLaborIncome, 200);
  assert.equal(current.meta.baselinePoint.work, 6);
  assert.equal(current.meta.baselinePoint.income, 500);
  assert.equal(current.meta.nonworkPoint.income, 400);
  cliff = current.rendered.find(series => series.name === '补贴断崖（示意）');
  assert.deepEqual(cliff.data.map(point => point.value ?? point), [[16, 200], [16, 400]]);

  await page.fill('#non-labor-income', '100');
  await page.fill('#max-benefit', '100');
  current = await validateCurrent();
  assert.equal(current.meta.participationChoice, 'work');
  assert.equal(current.meta.policyPoint.work, current.meta.baselinePoint.work);

  await page.fill('#max-benefit', '200');
  await page.fill('#wage-rate', '100');
  current = await validateCurrent();
  assert.equal(current.meta.participationChoice, 'work');

  await page.fill('#wage-rate', '50');
  await page.locator('[data-policy-type="phaseout"]').click();
  assert.equal(await page.locator('#reduction-rate').count(), 1, 'reduction rate should be shown for gradual phaseout');
  await page.locator('.stage-button').nth(1).click();
  current = await validateCurrent();
  assert.equal(current.params.policyType, 'phaseout');
  assert.equal(current.meta.phaseOutEarnedIncome, 400);
  assert.equal(current.meta.phaseOutWork, 8);
  assert.equal(current.meta.hasVisibleKink, true);
  assert.ok(current.texts.includes('K'));
  assert.ok(!current.texts.includes('C'));

  await page.locator('.stage-button').nth(2).click();
  current = await validateCurrent();
  assert.deepEqual(current.meta.policyPoint, {
    leisure: 14,
    work: 2,
    earnedIncome: 100,
    benefit: 150,
    income: 350,
    utility: 4900,
  });
  assert.ok(current.texts.includes('B'));

  await page.fill('#non-labor-income', '200');
  current = await validateCurrent();
  assert.equal(current.meta.nonLaborIncome, 200);
  assert.equal(current.meta.baselinePoint.work, 6);
  assert.equal(current.meta.kinkPoint.income, 600);
  assert.equal(current.meta.policyPoint.income, 400);

  await page.fill('#non-labor-income', '100');
  await page.locator('.stage-button').nth(1).click();
  await page.fill('#reduction-rate', '1');
  current = await validateCurrent();
  assert.equal(current.meta.phaseOutWork, 4);
  assert.equal(current.meta.hasVisibleKink, true);

  await page.fill('#reduction-rate', '0');
  current = await validateCurrent();
  assert.equal(current.meta.phaseOutEarnedIncome, null);
  assert.equal(current.meta.hasVisibleKink, false);
  assert.ok(!current.texts.includes('K'));

  await page.locator('[data-policy-type="nail"]').click();
  current = await validateCurrent();
  assert.equal(current.params.policyType, 'nail');
  assert.equal(await page.locator('#reduction-rate').count(), 0);

  await page.screenshot({ path: `${artifacts}/welfare-final.png` });
  assert.deepEqual(errors, [], 'browser console/runtime errors');
  console.log('PASS: nail welfare default, adjustable non-labor income, policy switching, and gradual phaseout render correctly.');
} finally {
  await writeFile(`${artifacts}/trace.json`, JSON.stringify({ traces, errors }, null, 2));
  await browser?.close();
  server.kill();
}
