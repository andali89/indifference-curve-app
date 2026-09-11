import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UTILITY_DEFAULTS, optimalWorkHoursRaw, utilityAt, incomeAtUtility, compensatedChoice,
} from '../src/curves/utilityModels.js';
import { calculateOptimum, computeWageEffectsSeries } from '../src/curves/wage-effects/logic.js';
import { calculateWelfareAnalysis, computeWelfareTransferSeries } from '../src/curves/welfare-transfer/logic.js';
import { calOptimalWorkT } from '../src/curves/supply-curve/logic.js';

function close(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`);
}

const models = [
  { ...UTILITY_DEFAULTS },
  { ...UTILITY_DEFAULTS, iWeight: 1.5, hWeight: 0.7 },
  { ...UTILITY_DEFAULTS, utilityType: 'satiating-income' },
  { ...UTILITY_DEFAULTS, utilityType: 'satiating-income', satiationK: 900, leisureGamma: 0.05 },
];

for (const params of models) {
  test(`budget optima agree with labor supply and maximize utility: ${JSON.stringify(params)}`, async () => {
    for (const wageRate of [1, 10, 30, 50, 100, 1000]) {
      const work = optimalWorkHoursRaw({ ...params, wageRate });
      const utility = utilityAt(100 + wageRate * work, 16 - work, params);
      const supply = await calOptimalWorkT({ ...params, wageRate });
      assert.equal(calculateOptimum(wageRate, params).work, supply.optimum.workT);
      for (let sample = 0; sample <= 160; sample++) {
        const candidate = utilityAt(100 + wageRate * sample / 10, 16 - sample / 10, params);
        assert.ok(utility >= candidate - 1e-8);
      }
    }
  });

  test(`compensation preserves final utility and minimizes expenditure: ${JSON.stringify(params)}`, () => {
    for (const oldWage of [1, 30, 50, 100, 1000]) {
      for (const newWage of [1, 30, 50, 100, 1000]) {
        const work = optimalWorkHoursRaw({ ...params, wageRate: newWage });
        const target = utilityAt(100 + newWage * work, 16 - work, params);
        const b = compensatedChoice(target, oldWage, params);
        assert.ok(Number.isFinite(b.income) && b.income >= 0 && b.leisure >= 0 && b.leisure <= 16);
        close(utilityAt(b.income, b.leisure, params), target);
        const cost = b.income + oldWage * b.leisure;
        for (let sample = 0; sample <= 320; sample++) {
          const h = sample / 20;
          const income = incomeAtUtility(target, h, params);
          if (income !== null && Number.isFinite(income)) assert.ok(cost <= income + oldWage * h + 1e-7);
        }
        if (b.leisure > 1e-8 && b.leisure < 16 - 1e-8 && b.income > 1e-8) {
          const mrs = params.utilityType === 'satiating-income'
            ? params.leisureGamma * params.satiationK * Math.exp(b.income / params.satiationK)
            : params.hWeight * b.income / (params.iWeight * b.leisure);
          close(mrs, oldWage);
        }
        const result = computeWageEffectsSeries({ ...params, initialWage: oldWage, newWage, stage: 3 });
        const effects = result.meta.effects;
        close(effects.incomeWork + effects.substitutionWork, effects.totalWork, 0.011);
        for (const series of result.series) {
          for (const datum of series.data) assert.ok((datum.value ?? datum).every(Number.isFinite));
        }
      }
    }
  });
}

test('known default results and satiating income-utility domain', () => {
  const cd = computeWageEffectsSeries({ stage: 3 });
  assert.deepEqual(cd.meta.effects, { substitutionWork: 3.52, incomeWork: -3.02, totalWork: 0.5 });
  const satiating = { ...UTILITY_DEFAULTS, utilityType: 'satiating-income' };
  const result = computeWageEffectsSeries({ ...satiating, stage: 3 });
  assert.deepEqual(result.meta.effects, { substitutionWork: 6.6, incomeWork: -7.36, totalWork: -0.76 });
  assert.equal(incomeAtUtility(1.2, 0, satiating), null);
  assert.equal(incomeAtUtility(0.1, 16, satiating), null);
});

test('welfare transfer default kink coordinates are correct', () => {
  const result = calculateWelfareAnalysis({ wageRate: 50, maxBenefit: 200, reductionRate: 0.5 });
  close(result.phaseOutEarnedIncome, 400);
  close(result.phaseOutWork, 8);
  assert.equal(result.hasVisibleKink, true);
  close(result.kinkPoint.leisure, 8);
  close(result.kinkPoint.work, 8);
  close(result.kinkPoint.income, 500);
  close(result.kinkPoint.benefit, 0);
});

test('zero transfer reproduces the baseline budget and optimum', () => {
  const result = calculateWelfareAnalysis({ wageRate: 50, maxBenefit: 0, reductionRate: 0.5 });
  close(result.policyPoint.work, result.baselinePoint.work);
  close(result.policyPoint.leisure, result.baselinePoint.leisure);
  close(result.policyPoint.income, result.baselinePoint.income);

  const chart = computeWelfareTransferSeries({ wageRate: 50, maxBenefit: 0, reductionRate: 0.5, stage: 2 });
  const baseline = chart.series.find((series) => series.name === '无补贴预算线');
  const policy = chart.series.find((series) => series.name === '福利计划预算约束');
  assert.deepEqual(policy.data, baseline.data);
});

test('benefit reduction rate moves the phase-out point as expected', () => {
  const lowRate = calculateWelfareAnalysis({ wageRate: 50, maxBenefit: 200, reductionRate: 0.25 });
  const mediumRate = calculateWelfareAnalysis({ wageRate: 50, maxBenefit: 200, reductionRate: 0.5 });
  const highRate = calculateWelfareAnalysis({ wageRate: 50, maxBenefit: 200, reductionRate: 1 });
  close(lowRate.phaseOutWork, 16);
  close(mediumRate.phaseOutWork, 8);
  close(highRate.phaseOutWork, 4);
  assert.ok(highRate.phaseOutWork < mediumRate.phaseOutWork);
});

test('welfare optima lie on the policy budget and chart data stay finite', () => {
  for (const wageRate of [10, 50, 100]) {
    for (const maxBenefit of [0, 100, 400]) {
      for (const reductionRate of [0, 0.5, 1]) {
        const result = calculateWelfareAnalysis({ wageRate, maxBenefit, reductionRate });
        const point = result.policyPoint;
        close(point.work + point.leisure, 16);
        const expectedBenefit = Math.max(0, maxBenefit - reductionRate * wageRate * point.work);
        close(point.benefit, expectedBenefit);
        close(point.income, 100 + wageRate * point.work + expectedBenefit);
        assert.ok([point.work, point.leisure, point.income, point.utility].every(Number.isFinite));

        const chart = computeWelfareTransferSeries({ wageRate, maxBenefit, reductionRate, stage: 3 });
        for (const series of chart.series) {
          for (const datum of series.data) assert.ok((datum.value ?? datum).every(Number.isFinite));
        }
      }
    }
  }
});
