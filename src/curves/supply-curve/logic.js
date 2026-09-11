import {
  TOTAL_AVAILABLE_HOURS, UTILITY_MODELS, UTILITY_MODEL_NAMES,
  optimalWorkHoursCobbDouglasRaw, optimalWorkHoursSatiatingRaw, utilityAt,
} from '../utilityModels.js';

function normalizeNonLaborIncome(value) {
  return Math.max(Number(value) || 0, 0);
}

export function optimalWorkHoursCobbDouglas(params = {}) {
  return round(optimalWorkHoursCobbDouglasRaw(params));
}

export function optimalWorkHoursSatiating(params = {}) {
  return round(optimalWorkHoursSatiatingRaw(params));
}

export function getSatiatingTurningWage(params = {}) {
  const {
    unearnedIncome = 100,
    satiationK = 660,
    leisureGamma = 0.029,
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
  const { wageRate = 50, unearnedIncome = 100 } = params;

  const nonLaborIncome = normalizeNonLaborIncome(unearnedIncome);
  const leisureHours = TOTAL_AVAILABLE_HOURS - workHours;
  const income = nonLaborIncome + wageRate * workHours;

  return utilityAt(income, leisureHours, params);
}

export async function calOptimalWorkT(params = {}) {
  const { utilityType = UTILITY_MODELS.COBB_DOUGLAS } = params;
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
    satiationK = 660,
    leisureGamma = 0.029,
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
    if (!result.success) {
      continue;
    }

    const workHours = result.optimum.workT;

    // For the satiating-income teaching curve, do not draw repeated
    // zero-work corner solutions below the reservation wage. The underlying
    // optimum remains zero; only the displayed supply curve starts when the
    // worker first supplies positive labor.
    if (
      utilityType === UTILITY_MODELS.SATIATING_INCOME &&
      !(workHours > 0)
    ) {
      continue;
    }

    data.push([workHours, wageRate]);
  }

  if (data.length > 0 && data[data.length - 1][1] !== wMax) {
    const result = await calOptimalWorkT({ ...params, wageRate: wMax });
    if (result.success) {
      const workHours = result.optimum.workT;
      if (
        utilityType !== UTILITY_MODELS.SATIATING_INCOME ||
        workHours > 0
      ) {
        data.push([workHours, wMax]);
      }
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
      utilityModelName:
        UTILITY_MODEL_NAMES[utilityType] || UTILITY_MODEL_NAMES[UTILITY_MODELS.COBB_DOUGLAS],
      turningWage,
      turningPointVisible:
        turningWage !== null && turningWage >= wMin && turningWage <= wMax,
    },
  };
}

function round(value) {
  return Number.parseFloat(value.toFixed(2));
}
