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

function calculateHicksPointRaw(referenceUtility, wageRate) {
  const wage = normalizeWage(wageRate, MIN_WAGE);
  if (!(referenceUtility > 0)) {
    return {
      leisure: 0,
      work: TOTAL_AVAILABLE_HOURS,
      income: 0,
      utility: 0,
    };
  }

  const interiorLeisure = Math.sqrt(referenceUtility / wage);
  const leisure = clamp(interiorLeisure, 0, TOTAL_AVAILABLE_HOURS);
  const income = referenceUtility / leisure;

  return {
    leisure,
    work: TOTAL_AVAILABLE_HOURS - leisure,
    income,
    utility: referenceUtility,
  };
}

function calculateDecompositionRaw(params = {}) {
  const initialWage = normalizeWage(params.initialWage, DEFAULT_INITIAL_WAGE);
  const newWage = normalizeWage(params.newWage, DEFAULT_NEW_WAGE);
  const pointA = calculateOptimumRaw(initialWage);
  const pointC = calculateOptimumRaw(newWage);
  // Evaluate the old wage at the final utility: A→B is income, B→C substitution.
  const pointB = calculateHicksPointRaw(pointC.utility, initialWage);

  return {
    initialWage,
    newWage,
    pointA,
    pointB,
    pointC,
    effects: {
      substitutionWork: pointC.work - pointB.work,
      incomeWork: pointB.work - pointA.work,
      totalWork: pointC.work - pointA.work,
    },
  };
}

export function calculateOptimum(wageRate) {
  return roundPoint(calculateOptimumRaw(wageRate));
}

export function calculateHicksCompensatedPoint(referenceUtility, wageRate) {
  return roundPoint(calculateHicksPointRaw(referenceUtility, wageRate));
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
  const series = [];

  series.push(
    makeLineSeries('初始预算线', generateBudgetLine(result.initialWage), '#0066cc', 3),
    makeLineSeries('初始无差异曲线 U₀', generateIndifferenceCurve(result.pointA.utility, axis.max), '#dc2626', 2.5, 'solid', true),
    makePointSeries('A', result.pointA)
  );

  if (stage >= 2) {
    series.push(
      makeLineSeries('新预算线', generateBudgetLine(result.newWage), '#0f766e', 3),
      makeLineSeries('新无差异曲线 U₁', generateIndifferenceCurve(result.pointC.utility, axis.max), '#ea580c', 2.5, 'solid', true),
      makePointSeries('C', result.pointC)
    );
  }

  if (stage >= 3) {
    series.push(
      makeLineSeries('Hicks 补偿线', generateCompensatedBudgetLine(result.pointB, result.initialWage), '#7c3aed', 2.5, 'dashed'),
      makePointSeries('B', result.pointB),
      ...[result.pointA, result.pointB, result.pointC].map((point) => ({
        ...makeLineSeries('', [[round(point.leisure), round(point.income)], [round(point.leisure), 0]], '#94a3b8', 1.5, 'dashed'),
        silent: true,
        tooltip: { show: false },
        z: 1,
      }))
    );

    const span = axis.max - axis.min;
    const substitutionGuide = makeEffectGuide(
      result.pointB.leisure,
      result.pointC.leisure,
      axis.min + span * 0.05,
      '替代效应 B→C',
      '#2563eb'
    );
    const incomeGuide = makeEffectGuide(
      result.pointA.leisure,
      result.pointB.leisure,
      axis.min + span * 0.13,
      '收入效应 A→B',
      '#a16207'
    );
    if (substitutionGuide) series.push(substitutionGuide);
    if (incomeGuide) series.push(incomeGuide);
  }

  return {
    series,
    axis,
    meta: {
      stage,
      compensationType: 'Hicksian',
      referenceUtility: 'final',
      totalHours: TOTAL_AVAILABLE_HOURS,
      nonLaborIncome: NON_LABOR_INCOME,
      initialWage: round(result.initialWage),
      newWage: round(result.newWage),
      initialPoint: roundPoint(result.pointA),
      compensatedPoint: roundPoint(result.pointB),
      newPoint: roundPoint(result.pointC),
      effects: roundEffects(result.effects),
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

function generateCompensatedBudgetLine(pointB, wageRate) {
  const fullIncome = pointB.income + wageRate * pointB.leisure;
  const incomeAtFullLeisure = fullIncome - wageRate * TOTAL_AVAILABLE_HOURS;

  if (incomeAtFullLeisure >= 0) {
    return [
      [0, round(fullIncome)],
      [TOTAL_AVAILABLE_HOURS, round(incomeAtFullLeisure)],
    ];
  }

  return [
    [0, round(fullIncome)],
    [round(fullIncome / wageRate), 0],
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
    visibleMax.push(result.pointB.income + result.initialWage * result.pointB.leisure);
  }

  const max = Math.max(...visibleMax, 100);
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

function makePointSeries(label, point) {
  return {
    name: '',
    type: 'scatter',
    data: [[round(point.leisure), round(point.income)]],
    symbolSize: 11,
    itemStyle: { color: '#111827' },
    label: {
      show: true,
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

function makeEffectGuide(fromLeisure, toLeisure, y, label, color) {
  if (Math.abs(toLeisure - fromLeisure) < 0.05) return null;

  return {
    name: '',
    type: 'line',
    data: [
      [round(fromLeisure), round(y)],
      {
        value: [round((fromLeisure + toLeisure) / 2), round(y)],
        label: {
          show: true,
          formatter: label,
          position: 'top',
          distance: 8,
          color,
          fontSize: 14,
          fontWeight: 600,
          backgroundColor: '#fff',
          padding: [3, 6],
        },
      },
      {
        value: [round(toLeisure), round(y)],
        symbol: 'triangle',
        symbolSize: 12,
        symbolRotate: toLeisure < fromLeisure ? 90 : -90,
        itemStyle: { color, opacity: 1 },
      },
    ],
    lineStyle: {
      color,
      width: 2.5,
    },
    symbol: 'circle',
    symbolSize: 1,
    itemStyle: { color: 'transparent' },
    tooltip: { show: false },
    silent: true,
    z: 5,
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
