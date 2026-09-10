const TOTAL_AVAILABLE_HOURS = 16;

const UTILITY_MODELS = {
  COBB_DOUGLAS: 'cobb-douglas',
  SATIATING_INCOME: 'satiating-income',
};

const UTILITY_MODEL_NAMES = {
  [UTILITY_MODELS.COBB_DOUGLAS]: 'Cobb–Douglas',
  [UTILITY_MODELS.SATIATING_INCOME]: '收入边际效用递减型',
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeNonLaborIncome(value) {
  return Math.max(Number(value) || 0, 0);
}

export function optimalWorkHoursCobbDouglas(params = {}) {
  const {
    wageRate = 50,
    unearnedIncome = 100,
    iWeight = 1,
    hWeight = 1,
  } = params;

  if (!(wageRate > 0) || !(iWeight > 0) || !(hWeight > 0)) {
    return 0;
  }

  const nonLaborIncome = normalizeNonLaborIncome(unearnedIncome);
  const totalWeight = iWeight + hWeight;

  // U = I^alpha * H^beta, where H is leisure.
  // Closed-form optimal work hours:
  // work = alpha/(alpha+beta) * T - beta/(alpha+beta) * V/w.
  const workHours =
    (iWeight / totalWeight) * TOTAL_AVAILABLE_HOURS -
    (hWeight / totalWeight) * (nonLaborIncome / wageRate);

  return round(clamp(workHours, 0, TOTAL_AVAILABLE_HOURS));
}

export function optimalWorkHoursSatiating(params = {}) {
  const {
    wageRate = 50,
    unearnedIncome = 100,
    satiationK = 200,
    leisureGamma = 0.0335,
  } = params;

  if (!(wageRate > 0) || !(satiationK > 0) || !(leisureGamma > 0)) {
    return 0;
  }

  const nonLaborIncome = normalizeNonLaborIncome(unearnedIncome);

  // U = 1 - exp(-I/K) + gamma * H, where H is leisure.
  // With I = V + w * work, the interior solution is
  // work = [K * ln(w / (gamma*K)) - V] / w.
  const workHours =
    (satiationK * Math.log(wageRate / (leisureGamma * satiationK)) - nonLaborIncome) /
    wageRate;

  return round(clamp(workHours, 0, TOTAL_AVAILABLE_HOURS));
}

export function getSatiatingTurningWage(params = {}) {
  const {
    unearnedIncome = 100,
    satiationK = 200,
    leisureGamma = 0.0335,
  } = params;

  if (!(satiationK > 0) || !(leisureGamma > 0)) {
    return null;
  }

  const nonLaborIncome = normalizeNonLaborIncome(unearnedIncome);
  const turningWage =
    leisureGamma * satiationK * Math.exp(1 + nonLaborIncome / satiationK);

  return Number.isFinite(turningWage) ? round(turningWage) : null;
}

function calculateUtility(params, workHours) {
  const {
    utilityType = UTILITY_MODELS.COBB_DOUGLAS,
    wageRate = 50,
    unearnedIncome = 100,
    iWeight = 1,
    hWeight = 1,
    satiationK = 200,
    leisureGamma = 0.0335,
  } = params;

  const nonLaborIncome = normalizeNonLaborIncome(unearnedIncome);
  const leisureHours = TOTAL_AVAILABLE_HOURS - workHours;
  const income = nonLaborIncome + wageRate * workHours;

  if (utilityType === UTILITY_MODELS.SATIATING_INCOME) {
    return 1 - Math.exp(-income / satiationK) + leisureGamma * leisureHours;
  }

  return Math.pow(income, iWeight) * Math.pow(leisureHours, hWeight);
}

export async function calOptimalWorkT(params = {}) {
  const {
    utilityType = UTILITY_MODELS.COBB_DOUGLAS,
  } = params;

  const workHours = utilityType === UTILITY_MODELS.SATIATING_INCOME
    ? optimalWorkHoursSatiating(params)
    : optimalWorkHoursCobbDouglas(params);

  return {
    success: true,
    optimum: {
      workT: workHours,
      leisureT: round(TOTAL_AVAILABLE_HOURS - workHours),
    },
    value: calculateUtility(params, workHours),
  };
}

export async function generateSupplyCurve(params, yAxisMax, step = 5) {
  const {
    utilityType = UTILITY_MODELS.COBB_DOUGLAS,
    iWeight = 1,
    hWeight = 1,
    satiationK = 200,
    leisureGamma = 0.0335,
    wMin = 10,
    wMax = 100,
  } = params;

  if (!(wMin > 0) || !(wMax > wMin)) {
    return [];
  }

  if (
    utilityType === UTILITY_MODELS.COBB_DOUGLAS &&
    (!(iWeight > 0) || !(hWeight > 0))
  ) {
    return [];
  }

  if (
    utilityType === UTILITY_MODELS.SATIATING_INCOME &&
    (!(satiationK > 0) || !(leisureGamma > 0))
  ) {
    return [];
  }

  const data = [];
  for (let wageRate = wMin; wageRate <= wMax; wageRate += step) {
    const result = await calOptimalWorkT({ ...params, wageRate });
    if (result.success) {
      data.push([result.optimum.workT, wageRate]);
    }
  }

  // Ensure the exact upper bound is represented when the step does not land on it.
  if (data.length > 0 && data[data.length - 1][1] !== wMax) {
    const result = await calOptimalWorkT({ ...params, wageRate: wMax });
    if (result.success) {
      data.push([result.optimum.workT, wMax]);
    }
  }

  return data;
}

export async function computeSupplySeries(params, sharedOptions = {}) {
  const {
    autoYAxis = false,
    manualYMin = 0,
    manualYMax = 100,
  } = sharedOptions;

  const {
    utilityType = UTILITY_MODELS.COBB_DOUGLAS,
    wMin = 10,
    wMax = 100,
  } = params;

  const yAxisMax = autoYAxis
    ? Math.ceil(wMax * 1.1)
    : Math.max(manualYMax ?? 0, (manualYMin ?? 0) + 100);
  const yAxisMin = autoYAxis
    ? Math.max(0, wMin - 10)
    : Math.max(manualYMin ?? 0, 0);

  const supplySeries = await generateSupplyCurve(params, yAxisMax);
  const turningWage = utilityType === UTILITY_MODELS.SATIATING_INCOME
    ? getSatiatingTurningWage(params)
    : null;

  return {
    series: [
      {
        name: '劳动供给曲线',
        type: 'line',
        data: supplySeries,
        lineStyle: {
          color: '#0066cc',
          width: 3,
        },
        symbol: 'circle',
        symbolSize: 6,
        smooth: false,
        meta: {
          holdEligible: false,
        },
      },
    ],
    axis: {
      min: yAxisMin,
      max: yAxisMax,
    },
    meta: {
      wageRange: `${wMin} - ${wMax}`,
      utilityType,
      utilityModelName: UTILITY_MODEL_NAMES[utilityType] || UTILITY_MODEL_NAMES[UTILITY_MODELS.COBB_DOUGLAS],
      turningWage,
      turningPointVisible:
        turningWage !== null && turningWage >= wMin && turningWage <= wMax,
    },
  };
}

function round(value) {
  return Number.parseFloat(value.toFixed(2));
}
