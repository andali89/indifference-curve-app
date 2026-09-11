const TOTAL_AVAILABLE_HOURS = 16;
const NON_LABOR_INCOME = 100;
const DEFAULT_INITIAL_WAGE = 50;
const DEFAULT_NEW_WAGE = 100;
const MIN_WAGE = 1;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeWage(value, fallback) {
  const wage = Number(value);
  return wage > 0 ? wage : fallback;
}

function normalizeStage(value) {
  return clamp(Math.round(Number(value) || 1), 1, 3);
}

function calculateOptimumRaw(wageRate) {
  const wage = normalizeWage(wageRate, MIN_WAGE);
  const fullIncome = NON_LABOR_INCOME + wage * TOTAL_AVAILABLE_HOURS;
  const leisure = clamp(fullIncome / (2 * wage), 0, TOTAL_AVAILABLE_HOURS);
  const income = fullIncome - wage * leisure;

  return {
    leisure,
    work: TOTAL_AVAILABLE_HOURS - leisure,
    income,
    utility: income * leisure,
  };
}

function calculateHicksPointRaw(initialUtility, newWageRate) {
  const wage = normalizeWage(newWageRate, MIN_WAGE);
  if (!(initialUtility > 0)) {
    return {
      leisure: 0,
      work: TOTAL_AVAILABLE_HOURS,
      income: 0,
      utility: 0,
    };
  }

  const interiorLeisure = Math.sqrt(initialUtility / wage);
  const leisure = clamp(interiorLeisure, 0, TOTAL_AVAILABLE_HOURS);
  const income = initialUtility / leisure;

  return {
    leisure,
    work: TOTAL_AVAILABLE_HOURS - leisure,
    income,
    utility: initialUtility,
  };
}

function calculateDecompositionRaw(params = {}) {
  const initialWage = normalizeWage(params.initialWage, DEFAULT_INITIAL_WAGE);
  const newWage = normalizeWage(params.newWage, DEFAULT_NEW_WAGE);
  const pointA = calculateOptimumRaw(initialWage);
  const pointC = calculateOptimumRaw(newWage);
  const pointB = calculateHicksPointRaw(pointA.utility, newWage);

  return {
    initialWage,
    newWage,
    pointA,
    pointB,
    pointC,
    effects: {
      substitutionWork: pointB.work - pointA.work,
      incomeWork: pointC.work - pointB.work,
      totalWork: pointC.work - pointA.work,
    },
  };
}

export function calculateOptimum(wageRate) {
  return roundPoint(calculateOptimumRaw(wageRate));
}

export function calculateHicksCompensatedPoint(initialUtility, newWageRate) {
  return roundPoint(calculateHicksPointRaw(initialUtility, newWageRate));
}

export function calculateDecomposition(params = {}) {
  const result = calculateDecompositionRaw(params);
  return {
    initialWage: round(result.initialWage),
    newWage: round(result.newWage),
    pointA: roundPoint(result.pointA),
    pointB: roundPoint(result.pointB),
    pointC: roundPoint(result.pointC),
    effects: roundEffects(result.effects),
  };
}

export function computeWageEffectsSeries(params = {}, sharedOptions = {}) {
  const {
    autoYAxis = false,
    manualYMin = 0,
    manualYMax = 2000,
  } = sharedOptions;

  const stage = normalizeStage(params.stage);
  const result = calculateDecompositionRaw(params);
  const axis = calculateAxis(result, stage, autoYAxis, manualYMin, manualYMax);
  const showWageChange = stage >= 2;
  const showDecomposition = stage >= 3;
  const span = axis.max - axis.min;

  // Keep a fixed series structure with stable ids. Only the data and labels of
  // later teaching stages are toggled. This prevents ECharts from having to
  // reconcile a changing number of series when moving between stages.
  const series = [
    makeLineSeries(
      'initial-budget',
      '初始预算线',
      generateBudgetLine(result.initialWage),
      '#0066cc',
      3
    ),
    makeLineSeries(
      'initial-utility',
      '初始无差异曲线 U₀',
      generateIndifferenceCurve(result.pointA.utility, axis.max),
      '#dc2626',
      2.5,
      'solid',
      true
    ),
    makePointSeries('point-a', 'A', result.pointA),

    makeLineSeries(
      'new-budget',
      showWageChange ? '新预算线' : '',
      showWageChange ? generateBudgetLine(result.newWage) : [],
      '#0f766e',
      3
    ),
    makeLineSeries(
      'new-utility',
      showWageChange ? '新无差异曲线 U₁' : '',
      showWageChange ? generateIndifferenceCurve(result.pointC.utility, axis.max) : [],
      '#ea580c',
      2.5,
      'solid',
      true
    ),
    makePointSeries('point-c', showWageChange ? 'C' : '', showWageChange ? result.pointC : null),

    makeLineSeries(
      'hicks-budget',
      showDecomposition ? 'Hicks 补偿线' : '',
      showDecomposition ? generateCompensatedBudgetLine(result.pointB, result.newWage) : [],
      '#0f766e',
      2.5,
      'dashed'
    ),
    makePointSeries('point-b', showDecomposition ? 'B' : '', showDecomposition ? result.pointB : null),
    makeEffectGuide(
      'substitution-guide',
      showDecomposition ? result.pointA.leisure : null,
      showDecomposition ? result.pointB.leisure : null,
      axis.min + span * 0.05,
      '替代效应'
    ),
    makeEffectGuide(
      'income-guide',
      showDecomposition ? result.pointB.leisure : null,
      showDecomposition ? result.pointC.leisure : null,
      axis.min + span * 0.11,
      '收入效应'
    ),
  ];

  return {
    series,
    axis,
    meta: {
      stage,
      compensationType: 'Hicksian',
      totalHours: TOTAL_AVAILABLE_HOURS,
      nonLaborIncome: NON_LABOR_INCOME,
      initialWage: round(result.initialWage),
      newWage: round(result.newWage),
      initialPoint: roundPoint(result.pointA),
      compensatedPoint: roundPoint(result.pointB),
      newPoint: roundPoint(result.pointC),
      effects: roundEffects(result.effects),
      visibleSeriesCount: stage === 1 ? 3 : stage === 2 ? 6 : 10,
      hasCornerSolution: [result.pointA, result.pointB, result.pointC].some(
        (point) => point.work < 1e-8
      ),
    },
  };
}

function generateBudgetLine(wageRate) {
  return [
    [0, round(NON_LABOR_INCOME + wageRate * TOTAL_AVAILABLE_HOURS)],
    [TOTAL_AVAILABLE_HOURS, NON_LABOR_INCOME],
  ];
}

function generateCompensatedBudgetLine(pointB, newWageRate) {
  const fullIncome = pointB.income + newWageRate * pointB.leisure;
  const incomeAtFullLeisure = fullIncome - newWageRate * TOTAL_AVAILABLE_HOURS;

  if (incomeAtFullLeisure >= 0) {
    return [
      [0, round(fullIncome)],
      [TOTAL_AVAILABLE_HOURS, round(incomeAtFullLeisure)],
    ];
  }

  return [
    [0, round(fullIncome)],
    [round(fullIncome / newWageRate), 0],
  ];
}

function generateIndifferenceCurve(utility, yAxisMax, step = 0.05) {
  if (!(utility > 0)) return [];

  const data = [];
  for (let leisure = step; leisure <= TOTAL_AVAILABLE_HOURS; leisure += step) {
    const income = utility / leisure;
    if (!Number.isFinite(income) || income < 0) continue;
    if (Number.isFinite(yAxisMax) && income > yAxisMax * 1.05) continue;
    data.push([round(leisure), round(income)]);
  }
  return data;
}

function calculateAxis(result, stage, autoYAxis, manualYMin, manualYMax) {
  if (!autoYAxis) {
    const min = Math.max(Number(manualYMin) || 0, 0);
    const max = Math.max(Number(manualYMax) || 2000, min + 100);
    return { min, max };
  }

  const visibleMax = [NON_LABOR_INCOME + result.initialWage * TOTAL_AVAILABLE_HOURS];
  if (stage >= 2) {
    visibleMax.push(NON_LABOR_INCOME + result.newWage * TOTAL_AVAILABLE_HOURS);
  }
  if (stage >= 3) {
    visibleMax.push(result.pointB.income + result.newWage * result.pointB.leisure);
  }

  const max = Math.max(...visibleMax, 100);
  return {
    min: 0,
    max: Math.ceil((max * 1.1) / 100) * 100,
  };
}

function makeLineSeries(id, name, data, color, width, type = 'solid', smooth = false) {
  return {
    id,
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

function makePointSeries(id, label, point) {
  return {
    id,
    name: '',
    type: 'scatter',
    data: point ? [[round(point.leisure), round(point.income)]] : [],
    symbolSize: 11,
    itemStyle: { color: '#111827' },
    label: {
      show: Boolean(point),
      formatter: label,
      position: 'top',
      distance: 8,
      fontSize: 16,
      fontWeight: 700,
      color: '#111827',
    },
    tooltip: { show: false },
    z: 6,
    meta: { holdEligible: false },
  };
}

function makeEffectGuide(id, fromLeisure, toLeisure, y, label) {
  const hidden = !Number.isFinite(fromLeisure)
    || !Number.isFinite(toLeisure)
    || Math.abs(toLeisure - fromLeisure) < 0.05;

  return {
    id,
    name: '',
    type: 'line',
    data: hidden
      ? []
      : [
          [round(fromLeisure), round(y)],
          [round(toLeisure), round(y)],
        ],
    lineStyle: {
      color: '#6b7280',
      width: 1.5,
      type: 'dashed',
    },
    symbol: 'none',
    endLabel: {
      show: !hidden,
      formatter: hidden ? '' : `${toLeisure < fromLeisure ? '←' : '→'} ${label}`,
      color: '#4b5563',
      fontSize: 13,
      distance: 6,
    },
    tooltip: { show: false },
    silent: true,
    z: 1,
    meta: { holdEligible: false },
  };
}

function roundPoint(point) {
  return {
    leisure: round(point.leisure),
    work: round(point.work),
    income: round(point.income),
    utility: round(point.utility),
  };
}

function roundEffects(effects) {
  return {
    substitutionWork: round(effects.substitutionWork),
    incomeWork: round(effects.incomeWork),
    totalWork: round(effects.totalWork),
  };
}

function round(value) {
  return Number.parseFloat(Number(value).toFixed(2));
}
