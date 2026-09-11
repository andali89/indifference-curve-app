// npm ci; npx playwright install chromium; npm run test:browser
// Or use an installed browser: BROWSER_CHANNEL=chrome (or msedge).
// This starts its own Vite dev server; Vue internals are inspected only here.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { computeWageEffectsSeries } from '../src/curves/wage-effects/logic.js';

const url = 'http://127.0.0.1:4175/indifference-curve-app/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'pipe' });
let serverOutput = '';
server.stdout.on('data', data => { serverOutput += data; });
server.stderr.on('data', data => { serverOutput += data; });
let browser;
const artifacts = 'node_modules/.cache/chart-rendering';
const traces = [];
const errors = [];

try {
  await mkdir(artifacts, { recursive: true });
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if ((await fetch(url)).ok) break; } catch {}
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
  await page.selectOption('#curve-select', 'wage-effects');
  await page.evaluate(() => {
    window.chartParts = () => {
      const area = document.querySelector('.chart-area').__vueParentComponent;
      const chart = document.querySelector('.chart').__vueParentComponent;
      return { area, chart, state: area.parent.setupState };
    };
    window.controlPayloads = [];
    const panel = document.querySelector('.curve-panel').__vueParentComponent;
    const controls = panel.subTree.children[0].component;
    const emit = controls.emit;
    controls.emit = (event, ...args) => {
      window.controlPayloads.push(JSON.parse(JSON.stringify({ event, args })));
      return emit(event, ...args);
    };
  });

  async function snapshot() {
    // Allow the default ECharts animation to finish before checking pixels/views.
    await page.waitForTimeout(1100);
    return page.evaluate(() => {
      const { area, chart, state } = window.chartParts();
      const instance = chart.exposed.chart.value;
      const display = instance.getZr().storage.getDisplayList();
      const views = instance.getModel().getSeries().map(model => {
        const view = instance.getViewOfSeriesModel(model);
        let elements = 0;
        view.group.traverse(element => { if (!element.isGroup && !element.ignore) elements++; });
        return { type: model.subType, elements };
      });
      return JSON.parse(JSON.stringify({
        payload: window.controlPayloads.at(-1), params: state.activeParams,
        meta: state.chartMeta, result: state.currentResult,
        displaySeries: state.displaySeries, chartOption: area.setupState.chartOption,
        received: chart.props.option, rendered: instance.getOption().series,
        instanceId: instance.id, views, displayCount: display.length,
        texts: display.filter(element => element.type === 'tspan').map(element => element.style.text),
        effectLabels: display.filter(element => element.type === 'tspan' && /^(收入效应 A|替代效应 B)/.test(element.style.text)).map(element => {
          const rect = element.getBoundingRect().clone();
          if (element.transform) rect.applyTransform(element.transform);
          return { text: element.style.text, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }),
        info: document.querySelector('.chart-header').textContent,
        pixels: document.querySelector('.chart canvas').toDataURL(),
      }));
    });
  }

  let instanceId;
  async function checkWages(stage, initialWage = 50, newWage = 100) {
    const s = await snapshot();
    const expected = computeWageEffectsSeries({ stage, initialWage, newWage });
    assert.equal(s.params.stage, stage);
    assert.equal(s.params.initialWage, initialWage);
    assert.equal(s.params.newWage, newWage);
    assert.equal(s.payload.event, 'update:modelValue');
    assert.deepEqual(s.payload.args[0], s.params);
    assert.deepEqual(s.result, expected);
    assert.deepEqual(s.meta, expected.meta);
    if (stage < 3) assert.ok(s.info.includes(`${expected.meta.initialPoint.work.toFixed(2)} 小时`));
    if (stage === 2) assert.ok(s.info.includes(`${expected.meta.newPoint.work.toFixed(2)} 小时`));
    if (stage > 1) {
      const effects = stage === 2 ? [expected.meta.effects.totalWork] : Object.values(expected.meta.effects);
      for (const effect of effects) {
        assert.ok(s.info.includes(`${effect > 0 ? '+' : ''}${effect.toFixed(2)} 小时`));
      }
    }
    assert.deepEqual(s.displaySeries, expected.series);
    const optionSeries = expected.series.map(({ meta, ...series }) => series);
    assert.deepEqual(s.chartOption.series, optionSeries);
    assert.deepEqual(s.received.series, optionSeries);
    assert.equal(s.rendered.length, expected.series.length);
    s.rendered.forEach((series, index) => {
      assert.equal(series.type, expected.series[index].type);
      assert.deepEqual(series.data.map(point => point.value ?? point), expected.series[index].data.map(point => point.value ?? point));
      assert.ok(s.views[index].elements > 0, `stage ${stage}: empty series view ${index}`);
      for (const point of series.data) assert.ok((point.value ?? point).every(Number.isFinite));
    });
    for (const label of stage === 1 ? ['A'] : stage === 2 ? ['A', 'C'] : ['A', 'B', 'C']) {
      assert.ok(s.texts.includes(label), `stage ${stage}: missing rendered ${label}`);
    }
    if (stage === 3) {
      const compensation = s.rendered.find(series => series.name === 'Hicks 补偿线');
      const [start, end] = compensation.data;
      assert.ok(Math.abs((end[1] - start[1]) / (end[0] - start[0]) + initialWage) < 0.1);
      assert.equal(s.meta.compensatedPoint.utility, s.meta.newPoint.utility);
      const projections = s.rendered.filter(series => series.type === 'line' && series.data.length === 2 && series.data[0][0] === series.data[1][0]);
      assert.equal(projections.length, 3);
      for (const projection of projections) assert.equal(projection.data[1][1], 0);
      if (initialWage !== newWage) {
        assert.equal(s.effectLabels.length, 2);
        const [a, b] = s.effectLabels;
        assert.ok(a.y + a.height < b.y || b.y + b.height < a.y, 'effect labels must occupy separate rows');
      }
    }
    assert.ok(s.displayCount > 0);
    instanceId ??= s.instanceId;
    assert.equal(s.instanceId, instanceId, 'stage changes must update the existing chart');
    const { pixels, ...trace } = s;
    traces.push(trace);
    return s;
  }

  const stagePixels = new Set();
  for (const stage of [1, 2, 3, 1, 2, 3]) {
    await page.locator('.stage-button').nth(stage - 1).click();
    const s = await checkWages(stage);
    stagePixels.add(s.pixels);
    await page.screenshot({ path: `${artifacts}/stage-${stage}.png` });
  }
  assert.ok(stagePixels.size >= 3, 'stages must change the canvas');
  const defaults = traces.at(-1).meta;
  assert.deepEqual(defaults.initialPoint, { leisure: 9, work: 7, income: 450, utility: 4050 });
  assert.deepEqual(defaults.compensatedPoint, { leisure: 12.02, work: 3.98, income: 601.04, utility: 7225 });
  assert.deepEqual(defaults.newPoint, { leisure: 8.5, work: 7.5, income: 850, utility: 7225 });
  assert.deepEqual(defaults.effects, { substitutionWork: 3.52, incomeWork: -3.02, totalWork: 0.5 });
  for (const value of ['+3.52', '-3.02', '+0.50']) assert.ok(traces.at(-1).info.includes(value));

  for (const stage of [1, 2, 3]) {
    await page.locator('.stage-button').nth(stage - 1).click();
    const before = await checkWages(stage);
    await page.fill('#initial-wage', '60');
    const changedInitial = await checkWages(stage, 60, 100);
    assert.notEqual(changedInitial.pixels, before.pixels);
    await page.fill('#new-wage', '120');
    const changedNew = await checkWages(stage, 60, 120);
    if (stage > 1) assert.notEqual(changedNew.pixels, changedInitial.pixels);
    await page.fill('#initial-wage', '50');
    await page.fill('#new-wage', '100');
  }
  // Burst input/stage events exercise the async recompute boundary without sleeps.
  await page.evaluate(() => {
    for (let cycle = 0; cycle < 5; cycle++) {
      for (const button of document.querySelectorAll('.stage-button')) button.click();
    }
  });
  await checkWages(3);

  await page.setViewportSize({ width: 1000, height: 800 });
  await checkWages(3);
  await page.screenshot({ path: `${artifacts}/stage-3-compact.png` });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.fill('#new-wage', '30');
  await checkWages(3, 50, 30);
  await page.fill('#new-wage', '50');
  await checkWages(3, 50, 50);

  for (const [module, edits] of [
    ['indifference', [['#wage-rate', '20'], ['#i-weight', '1.5'], ['#unearned-income', '100']]],
    ['supply-curve', [['#i-weight', '1.5'], ['#unearned-income', '200'], ['#w-max', '120']]],
  ]) {
    await page.selectOption('#curve-select', module);
    let previous = await snapshot();
    for (const [selector, value] of edits) {
      await page.fill(selector, value);
      const s = await snapshot();
      assert.notDeepEqual(s.rendered.map(x => x.data), previous.rendered.map(x => x.data), `${module} ${selector}: data unchanged`);
      assert.notEqual(s.pixels, previous.pixels, `${module} ${selector}: canvas unchanged`);
      assert.ok(s.views.every(view => view.elements > 0));
      previous = s;
    }
    await page.screenshot({ path: `${artifacts}/${module}.png` });
  }
  await page.selectOption('#utility-type', 'satiating-income');
  const beforeSatiation = await snapshot();
  await page.fill('#satiation-k', '800');
  const afterSatiation = await snapshot();
  assert.notDeepEqual(afterSatiation.rendered.map(x => x.data), beforeSatiation.rendered.map(x => x.data));
  assert.notEqual(afterSatiation.pixels, beforeSatiation.pixels);
  assert.deepEqual(errors, [], 'browser console/runtime errors');
  console.log('PASS: repeated stages, both wages at every stage, default economics, rapid stages, indifference and both supply utilities; no browser errors.');
} finally {
  await writeFile(`${artifacts}/trace.json`, JSON.stringify({ traces, errors }, null, 2));
  await browser?.close();
  server.kill();
}
