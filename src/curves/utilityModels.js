// Shared economics for labor supply and wage-effect decomposition.
export const TOTAL_AVAILABLE_HOURS = 16;
export const UTILITY_MODELS = {
  COBB_DOUGLAS: 'cobb-douglas',
  SATIATING_INCOME: 'satiating-income',
};
export const UTILITY_MODEL_NAMES = {
  [UTILITY_MODELS.COBB_DOUGLAS]: 'Cobb–Douglas',
  [UTILITY_MODELS.SATIATING_INCOME]: '收入边际效用递减型',
};
export const UTILITY_DEFAULTS = {
  utilityType: UTILITY_MODELS.COBB_DOUGLAS,
  iWeight: 1,
  hWeight: 1,
  satiationK: 660,
  leisureGamma: 0.029,
};

export function optimalWorkHoursCobbDouglasRaw(params = {}) {
  const { wageRate = 50, unearnedIncome = 100, iWeight = 1, hWeight = 1 } = params;
  if (!(wageRate > 0) || !(iWeight > 0) || !(hWeight > 0)) return 0;
  const income = Math.max(Number(unearnedIncome) || 0, 0);
  const totalWeight = iWeight + hWeight;
  return clamp((iWeight / totalWeight) * TOTAL_AVAILABLE_HOURS - (hWeight / totalWeight) * (income / wageRate));
}

export function optimalWorkHoursSatiatingRaw(params = {}) {
  const { wageRate = 50, unearnedIncome = 100, satiationK = 660, leisureGamma = 0.029 } = params;
  if (!(wageRate > 0) || !(satiationK > 0) || !(leisureGamma > 0)) return 0;
  const income = Math.max(Number(unearnedIncome) || 0, 0);
  return clamp((satiationK * Math.log(wageRate / (leisureGamma * satiationK)) - income) / wageRate);
}

export function optimalWorkHoursRaw(params = {}) {
  return params.utilityType === UTILITY_MODELS.SATIATING_INCOME
    ? optimalWorkHoursSatiatingRaw(params)
    : optimalWorkHoursCobbDouglasRaw(params);
}

export function utilityAt(income, leisure, params = {}) {
  const { utilityType, iWeight = 1, hWeight = 1, satiationK = 660, leisureGamma = 0.029 } = params;
  return utilityType === UTILITY_MODELS.SATIATING_INCOME
    ? -Math.expm1(-income / satiationK) + leisureGamma * leisure
    : Math.pow(income, iWeight) * Math.pow(leisure, hWeight);
}

// Returns null outside the nonnegative-income domain of the indifference curve.
export function incomeAtUtility(utility, leisure, params = {}) {
  const { utilityType, iWeight = 1, hWeight = 1, satiationK = 660, leisureGamma = 0.029 } = params;
  if (utilityType === UTILITY_MODELS.SATIATING_INCOME) {
    const exponential = 1 - utility + leisureGamma * leisure;
    if (!(exponential > 0) || exponential > 1 + 1e-12) return null;
    return Math.max(0, -satiationK * Math.log(exponential));
  }
  if (!(utility > 0)) return 0;
  if (!(leisure > 0)) return null;
  return Math.exp((Math.log(utility) - hWeight * Math.log(leisure)) / iWeight);
}

// Minimize I + wH at a given utility, subject to I≥0 and 0≤H≤16.
export function compensatedChoice(utility, wageRate, params = {}) {
  const { utilityType, iWeight = 1, hWeight = 1, satiationK = 660, leisureGamma = 0.029 } = params;
  let leisure;
  if (utilityType === UTILITY_MODELS.SATIATING_INCOME) {
    const interiorIncome = Math.max(0, satiationK * Math.log(wageRate / (leisureGamma * satiationK)));
    leisure = clamp((utility + Math.expm1(-interiorIncome / satiationK)) / leisureGamma);
  } else {
    leisure = utility > 0
      ? clamp(Math.exp((Math.log(utility) + iWeight * Math.log(hWeight / (iWeight * wageRate))) / (iWeight + hWeight)))
      : 0;
  }
  return { leisure, income: incomeAtUtility(utility, leisure, params) };
}

function clamp(hours) {
  return Math.min(Math.max(hours, 0), TOTAL_AVAILABLE_HOURS);
}
