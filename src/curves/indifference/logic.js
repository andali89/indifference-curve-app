const LEISURE_HOURS = 16;

export function generateBudgetLine(params) {
  const { wageRate = 0, unearnedIncome = 0 } = params;
  const data = [];
  for (let leisure = 0; leisure <= LEISURE_HOURS; leisure += 0.1) {
    const income = wageRate * (LEISURE_HOURS - leisure) + unearnedIncome;
    data.push([round(leisure), round(income)]);
  }
  return data;
}

export function generateIndifferenceCurve(params, yAxisMax, step = 0.05) {
  const {
    utility = 100,
    iWeight = 1,
    hWeight = 1,
  } = params;

  const data = [];
  if (!(utility > 0) || !(iWeight > 0) || !(hWeight > 0)) {
    return data;
  }

  for (let leisure = step; leisure <= LEISURE_HOURS; leisure += step) {
    const denominator = Math.pow(leisure, hWeight);
    if (!(denominator > 0)) continue;
    const income = Math.pow(utility / denominator, 1 / iWeight);
    if (!Number.isFinite(income) || income < 0) continue;
    if (Number.isFinite(yAxisMax) && yAxisMax > 0 && income > yAxisMax * 1.05) {
      continue;
    }
    data.push([round(leisure), round(income)]);
  }

  return data;
}

export function computeAutoYAxisMax(params) {
  const { wageRate = 0, unearnedIncome = 0 } = params;
  const incomeMax = wageRate * LEISURE_HOURS + unearnedIncome;
  const sample = generateIndifferenceCurve(params, Number.POSITIVE_INFINITY, 0.1);
  const sorted = [...sample].map(([, income]) => income).sort((a, b) => a - b);
  const anchorIndex = 29;
  const anchor = sorted.length > anchorIndex ? Math.floor(sorted[anchorIndex]) : 0;
  const curveMax = sorted.length ? anchor * 3 : 0;
  const best = Math.max(incomeMax, curveMax, 100);
  return Math.ceil(best * 1.1 / 100) * 100;
}

export function computeIndifferenceSeries(params, sharedOptions = {}) {
  const {
    autoYAxis = false,
    manualYMin = 0,
    manualYMax = 1200,
  } = sharedOptions;

  const yAxisMax = autoYAxis
    ? computeAutoYAxisMax(params)
    : Math.max(manualYMax ?? 1200, (manualYMin ?? 0) + 100);
  const yAxisMin = autoYAxis ? 0 : Math.max(manualYMin ?? 0, 0);

  const budgetSeries = generateBudgetLine(params);
  const indifferenceSeries = generateIndifferenceCurve(params, yAxisMax);

  const series = [
    {
      name: '预算约束线',
      type: 'line',
      data: budgetSeries,
      lineStyle: {
        color: '#0066cc',
        width: 3,
      },
      symbol: 'none',
      smooth: false,
      meta: {
        holdEligible: false,
      },
    },
    {
      name: `无差异曲线 (U=${Math.round(params.utility ?? 0)})`,
      type: 'line',
      data: indifferenceSeries,
      lineStyle: {
        color: '#ff6b6b',
        width: 3,
      },
      symbol: 'none',
      smooth: true,
      meta: {
        holdEligible: true,
        holdLabel: `无差异曲线 U=${Math.round(params.utility ?? 0)}`,
      },
    },
  ];

  return {
    series,
    axis: {
      min: yAxisMin,
      max: yAxisMax,
    },
    meta: {
      maxIncome: (params.wageRate ?? 0) * LEISURE_HOURS + (params.unearnedIncome ?? 0),
    },
  };
}

function round(value) {
  return Number.parseFloat(value.toFixed(2));
}
