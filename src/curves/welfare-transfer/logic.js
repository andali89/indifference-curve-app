import {
  TOTAL_AVAILABLE_HOURS,
  UTILITY_DEFAULTS,
  UTILITY_MODELS,
  UTILITY_MODEL_NAMES,
  incomeAtUtility,
  optimalWorkHoursRaw,
  utilityAt,
} from '../utilityModels.js';

const NON_LABOR_INCOME = 100;
const DEFAULT_WAGE = 50;
const DEFAULT_MAX_BENEFIT = 200;
const DEFAULT_REDUCTION_RATE = 0.5;

export const WELFARE_POLICY_TYPES = {
  NAIL: 'nail',
  PHASEOUT: 'phaseout',
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeUtilityParams(params = {}) {
  const normalized = { ...UTILITY_DEFAULTS };
  if (params.utilityType === UTILITY_MODELS.SATIATING_INCOME) normalized.utilityType = params.utilityType;
  for (const key of ['iWeight', 'hWeight', 'satiationK', 'leisureGamma']) {
    if (Number.isFinite(Number(params[key])) && Number(params[key]) > 0) normalized[key] = Number(params[key]);
  }
  return normalized;
}

function normalizeParams(params = {}) {
  const wageRate = Number(params.wageRate);
  const maxBenefit = Number(params.maxBenefit);
  const reductionRate = Number(params.reductionRate);

  return {
    policyType: params.policyType === WELFARE_POLICY_TYPES.PHASEOUT
      ? WELFARE_POLICY_TYPES.PHASEOUT
      : WELFARE_POLICY_TYPES.NAIL,
    wageRate: wageRate > 0 ? wageRate : DEFAULT_WAGE,
    maxBenefit: Number.isFinite(maxBenefit) && maxBenefit >= 0 ? maxBenefit : DEFAULT_MAX_BENEFIT,
    reductionRate: Number.isFinite(reductionRate)
      ? clamp(reductionRate, 0, 1)
      : DEFAULT_REDUCTION_RATE,
    stage: clamp(Math.round(Number(params.stage) || 1), 1, 3),
    utilityParams: normalizeUtilityParams(params),
  };
}

export function calculateTransfer(earnedIncome, params = {}) {
  const normalized = normalizeParams(params);
  const earnings = Math.max(Number(earnedIncome) || 0, 0);
  if (normalized.policyType === WELFARE_POLICY_TYPES.NAIL) {
    return earnings > 1e-10 ? 0 : normalized.maxBenefit;
  }
  return Math.max(0, normalized.maxBenefit - normalized.reductionRate * earnings);
}

function consumptionAtWork(workHours, normalized) {
  const work = clamp(Number(workHours) || 0, 0, TOTAL_AVAILABLE_HOURS);
  const earnedIncome = normalized.wageRate * work;
  const benefit = normalized.policyType === WELFARE_POLICY_TYPES.NAIL
    ? (work <= 1e-10 ? normalized.maxBenefit : 0)
    : Math.max(0, normalized.maxBenefit - normalized.reductionRate * earnedIncome);
  return {
    work,
    leisure: TOTAL_AVAILABLE_HOURS - work,
    earnedIncome,
    benefit,
    income: NON_LABOR_INCOME + earnedIncome + benefit,
  };
}

function pointWithUtility(point, utilityParams) {
  return {
    ...point,
    utility: utilityAt(point.income, point.leisure, utilityParams),
  };
}

function calculateBaselinePoint(normalized) {
  const work = optimalWorkHoursRaw({
    ...normalized.utilityParams,
    wageRate: normalized.wageRate,
    unearnedIncome: NON_LABOR_INCOME,
  });
  return pointWithUtility({
    work,
    leisure: TOTAL_AVAILABLE_HOURS - work,
    earnedIncome: normalized.wageRate * work,
    benefit: 0,
    income: NON_LABOR_INCOME + normalized.wageRate * work,
  }, normalized.utilityParams);
}

function calculatePhaseoutPolicyPoint(normalized) {
  if (normalized.maxBenefit === 0) return calculateBaselinePoint(normalized);

  const candidates = new Set([0, TOTAL_AVAILABLE_HOURS]);
  const { wageRate, maxBenefit, reductionRate, utilityParams } = normalized;
  const phaseOutWork = reductionRate > 0 ? maxBenefit / (reductionRate * wageRate) : Infinity;
  const benefitSegmentMax = clamp(phaseOutWork, 0, TOTAL_AVAILABLE_HOURS);

  if (Number.isFinite(phaseOutWork) && phaseOutWork > 0 && phaseOutWork < TOTAL_AVAILABLE_HOURS) {
    candidates.add(phaseOutWork);
  }

  const netWage = (1 - reductionRate) * wageRate;
  if (netWage > 0 && benefitSegmentMax > 0) {
    const benefitSegmentOptimum = optimalWorkHoursRaw({
      ...utilityParams,
      wageRate: netWage,
      unearnedIncome: NON_LABOR_INCOME + maxBenefit,
    });
    candidates.add(clamp(benefitSegmentOptimum, 0, benefitSegmentMax));
  }

  if (reductionRate === 0) {
    const unrestricted = optimalWorkHoursRaw({
      ...utilityParams,
      wageRate,
      unearnedIncome: NON_LABOR_INCOME + maxBenefit,
    });
    candidates.add(unrestricted);
  } else if (phaseOutWork < TOTAL_AVAILABLE_HOURS) {
    const baselineOptimum = optimalWorkHoursRaw({
      ...utilityParams,
      wageRate,
      unearnedIncome: NON_LABOR_INCOME,
    });
    candidates.add(clamp(baselineOptimum, Math.max(phaseOutWork, 0), TOTAL_AVAILABLE_HOURS));
  }

  let best = null;
  for (const candidate of candidates) {
    const point = pointWithUtility(consumptionAtWork(candidate, normalized), utilityParams);
    if (!Number.isFinite(point.utility)) continue;
    if (!best || point.utility > best.utility + 1e-10) best = point;
  }

  return best || pointWithUtility(consumptionAtWork(0, normalized), utilityParams);
}

function calculateNailChoice(normalized, baselinePoint) {
  const workingPoint = baselinePoint;
  const nonworkPoint = pointWithUtility(consumptionAtWork(0, normalized), normalized.utilityParams);
  const participationChoice = nonworkPoint.utility > workingPoint.utility + 1e-10 ? 'nonwork' : 'work';
  return {
    workingPoint,
    nonworkPoint,
    participationChoice,
    policyPoint: participationChoice === 'nonwork' ? nonworkPoint : workingPoint,
  };
}

export function calculateWelfareAnalysis(params = {}) {
  const normalized = normalizeParams(params);
  const baselinePoint = calculateBaselinePoint(normalized);

  if (normalized.policyType === WELFARE_POLICY_TYPES.NAIL) {
    const nail = calculateNailChoice(normalized, baselinePoint);
    return {
      ...normalized,
      baselinePoint,
      ...nail,
      phaseOutEarnedIncome: null,
      phaseOutWork: null,
      hasVisibleKink: false,
      kinkPoint: null,
      hasBenefitCliff: normalized.maxBenefit > 0,
      benefitCliffAmount: normalized.maxBenefit,
      workChange: nail.policyPoint.work - baselinePoint.work,
      leisureChange: nail.policyPoint.leisure - baselinePoint.leisure,
    };
  }

  const policyPoint = calculatePhaseoutPolicyPoint(normalized);
  const phaseOutEarnedIncome = normalized.reductionRate > 0
    ? normalized.maxBenefit / normalized.reductionRate
    : Infinity;
  const phaseOutWork = phaseOutEarnedIncome / normalized.wageRate;
  const hasVisibleKink = normalized.maxBenefit > 0
    && normalized.reductionRate > 0
    && phaseOutWork > 0
    && phaseOutWork < TOTAL_AVAILABLE_HOURS;
  const kinkPoint = hasVisibleKink
    ? pointWithUtility(consumptionAtWork(phaseOutWork, normalized), normalized.utilityParams)
    : null;

  return {
    ...normalized,
    baselinePoint,
    policyPoint,
    workingPoint: null,
    nonworkPoint: null,
    participationChoice: null,
    phaseOutEarnedIncome,
    phaseOutWork,
    hasVisibleKink,
    kinkPoint,
    hasBenefitCliff: false,
    benefitCliffAmount: 0,
    workChange: policyPoint.work - baselinePoint.work,
    leisureChange: policyPoint.leisure - baselinePoint.leisure,
  };
}

export function computeWelfareTransferSeries(params = {}, sharedOptions = {}) {
  const {
    autoYAxis = false,
    manualYMin = 0,
    manualYMax = 1000,
  } = sharedOptions;

  const result = calculateWelfareAnalysis(params);
  const axis = calculateAxis(result, autoYAxis, manualYMin, manualYMax);
  const series = [
    makeLineSeries('无补贴预算线', generateBaselineBudgetLine(result), '#2563eb', 3),
    makeLineSeries(
      '初始无差异曲线 U₀',
      generateIndifferenceCurve(result.baselinePoint.utility, axis.max, result.utilityParams, [result.baselinePoint]),
      '#dc2626',
      2.5,
      'solid',
      true
    ),
    makePointSeries('A', result.baselinePoint, '#111827'),
  ];

  if (result.stage >= 2) {
    if (result.policyType === WELFARE_POLICY_TYPES.NAIL) {
      series.push(makeLineSeries('钉子形：参加工作预算线', generateBaselineBudgetLine(result), '#0f766e', 3));
      if (result.hasBenefitCliff) {
        series.push(
          makeLineSeries(
            '补贴断崖 G（示意）',
            [[TOTAL_AVAILABLE_HOURS, NON_LABOR_INCOME], [TOTAL_AVAILABLE_HOURS, round(result.nonworkPoint.income)]],
            '#d97706',
            2,
            'dashed'
          ),
          makeOpenPointSeries([TOTAL_AVAILABLE_HOURS, NON_LABOR_INCOME], '#0f766e'),
          makePointSeries('C', result.nonworkPoint, result.stage >= 3 ? '#7c3aed' : '#d97706', 12)
        );
      }
    } else {
      series.push(makeLineSeries('福利计划预算约束', generatePhaseoutBudgetLine(result), '#0f766e', 3));
      if (result.kinkPoint) series.push(makePointSeries('K', result.kinkPoint, '#d97706', 12));
    }
  }

  if (result.stage >= 3) {
    if (result.policyType === WELFARE_POLICY_TYPES.NAIL) {
      if (Math.abs(result.policyPoint.utility - result.baselinePoint.utility) > 1e-8) {
        series.push(makeLineSeries(
          '福利计划下无差异曲线 U₁',
          generateIndifferenceCurve(result.policyPoint.utility, axis.max, result.utilityParams, [result.policyPoint]),
          '#7c3aed',
          2.5,
          'solid',
          true
        ));
      }
      series.push(makeProjection(result.baselinePoint));
      if (result.participationChoice === 'nonwork') series.push(makeProjection(result.nonworkPoint));
    } else {
      series.push(
        makeLineSeries(
          '福利计划下无差异曲线 U₁',
          generateIndifferenceCurve(result.policyPoint.utility, axis.max, result.utilityParams, [result.policyPoint]),
          '#7c3aed',
          2.5,
          'solid',
          true
        ),
        makePointSeries('B', result.policyPoint, '#7c3aed'),
        makeProjection(result.baselinePoint),
        makeProjection(result.policyPoint)
      );
    }
  }

  return {
    series,
    axis,
    meta: {
      stage: result.stage,
      policyType: result.policyType,
      utilityType: result.utilityParams.utilityType,
      utilityModelName: UTILITY_MODEL_NAMES[result.utilityParams.utilityType],
      totalHours: TOTAL_AVAILABLE_HOURS,
      nonLaborIncome: NON_LABOR_INCOME,
      wageRate: round(result.wageRate),
      maxBenefit: round(result.maxBenefit),
      reductionRate: round(result.reductionRate),
      phaseOutEarnedIncome: Number.isFinite(result.phaseOutEarnedIncome) ? round(result.phaseOutEarnedIncome) : null,
      phaseOutWork: Number.isFinite(result.phaseOutWork) ? round(result.phaseOutWork) : null,
      hasVisibleKink: result.hasVisibleKink,
      kinkPoint: result.kinkPoint ? roundPoint(result.kinkPoint) : null,
      hasBenefitCliff: result.hasBenefitCliff,
      benefitCliffAmount: round(result.benefitCliffAmount),
      participationChoice: result.participationChoice,
      workingPoint: result.workingPoint ? roundPoint(result.workingPoint) : null,
      nonworkPoint: result.nonworkPoint ? roundPoint(result.nonworkPoint) : null,
      baselinePoint: roundPoint(result.baselinePoint),
      policyPoint: roundPoint(result.policyPoint),
      workChange: round(result.workChange),
      leisureChange: round(result.leisureChange),
      benefitAtPolicyOptimum: round(result.policyPoint.benefit),
      hasCornerSolution: [result.baselinePoint, result.policyPoint].some(
        (point) => point.work < 1e-8 || point.work > TOTAL_AVAILABLE_HOURS - 1e-8
      ),
    },
  };
}

function generateBaselineBudgetLine(result) {
  return [
    [0, round(NON_LABOR_INCOME + result.wageRate * TOTAL_AVAILABLE_HOURS)],
    [TOTAL_AVAILABLE_HOURS, NON_LABOR_INCOME],
  ];
}

function generatePhaseoutBudgetLine(result) {
  const first = consumptionAtWork(TOTAL_AVAILABLE_HOURS, result);
  const last = consumptionAtWork(0, result);
  const data = [[0, round(first.income)]];

  if (result.hasVisibleKink && result.kinkPoint) {
    data.push([round(result.kinkPoint.leisure), round(result.kinkPoint.income)]);
  }

  data.push([TOTAL_AVAILABLE_HOURS, round(last.income)]);
  return data;
}

function generateIndifferenceCurve(utility, yAxisMax, params, points, step = 0.05) {
  if (!(utility > 0)) return [];

  const data = [];
  const leisureValues = new Set(points.map((point) => point.leisure));
  for (let index = 0; index <= TOTAL_AVAILABLE_HOURS / step; index++) leisureValues.add(index * step);

  for (const leisure of [...leisureValues].sort((a, b) => a - b)) {
    const income = incomeAtUtility(utility, leisure, params);
    if (!Number.isFinite(income) || income < 0) continue;
    if (Number.isFinite(yAxisMax) && income > yAxisMax * 1.05) continue;
    data.push([round(leisure), round(income)]);
  }
  return data;
}

function calculateAxis(result, autoYAxis, manualYMin, manualYMax) {
  if (!autoYAxis) {
    const min = Math.max(Number(manualYMin) || 0, 0);
    const max = Math.max(Number(manualYMax) || 1000, min + 100);
    return { min, max };
  }

  const policyAtMaxWork = consumptionAtWork(TOTAL_AVAILABLE_HOURS, result).income;
  const policyAtNoWork = consumptionAtWork(0, result).income;
  const baselineAtMaxWork = NON_LABOR_INCOME + result.wageRate * TOTAL_AVAILABLE_HOURS;
  const max = Math.max(
    policyAtMaxWork,
    policyAtNoWork,
    baselineAtMaxWork,
    result.baselinePoint.income,
    result.policyPoint.income,
    100
  );

  return {
    min: 0,
    max: Math.ceil((max * 1.1) / 100) * 100,
  };
}

function makeLineSeries(name, data, color, width, type = 'solid', smooth = false) {
  return {
    name,
    type: 'line',
    data,
    lineStyle: { color, width, type },
    itemStyle: { color },
    symbol: 'none',
    smooth,
    z: 2,
    meta: { holdEligible: false },
  };
}

function makePointSeries(label, point, color, symbolSize = 11) {
  return {
    name: '',
    type: 'scatter',
    data: [[round(point.leisure), round(point.income)]],
    symbolSize,
    itemStyle: { color },
    label: {
      show: true,
      formatter: label,
      position: 'top',
      distance: 8,
      fontSize: 16,
      fontWeight: 700,
      color,
    },
    tooltip: { show: false },
    z: 6,
    meta: { holdEligible: false },
  };
}

function makeOpenPointSeries(point, color) {
  return {
    name: '',
    type: 'scatter',
    data: [[round(point[0]), round(point[1])]],
    symbolSize: 10,
    itemStyle: {
      color: '#ffffff',
      borderColor: color,
      borderWidth: 2,
    },
    tooltip: { show: false },
    z: 7,
    meta: { holdEligible: false },
  };
}

function makeProjection(point) {
  return {
    ...makeLineSeries('', [[round(point.leisure), round(point.income)], [round(point.leisure), 0]], '#94a3b8', 1.5, 'dashed'),
    silent: true,
    tooltip: { show: false },
    z: 1,
  };
}

function roundPoint(point) {
  return {
    leisure: round(point.leisure),
    work: round(point.work),
    earnedIncome: round(point.earnedIncome),
    benefit: round(point.benefit),
    income: round(point.income),
    utility: round(point.utility),
  };
}

function round(value) {
  const rounded = Number.parseFloat(Number(value).toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}
