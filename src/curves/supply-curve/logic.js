// Import numeric at module level to avoid dynamic import issues
let numericLib = null;
let numericLoadError = null;

// Async initialization function
async function ensureNumeric() {
  if (numericLib) return numericLib;
  if (numericLoadError) throw numericLoadError;
  
  try {
    console.log('[ensureNumeric] Loading numeric via dynamic import...');
    const mod = await import('numeric');
    console.log('[ensureNumeric] Module loaded, keys:', Object.keys(mod));
    
    // Try multiple ways to get the numeric object
    numericLib = mod.default || mod.numeric || mod;
    
    console.log('[ensureNumeric] numericLib type:', typeof numericLib);
    console.log('[ensureNumeric] Has uncmin:', typeof numericLib?.uncmin);
    console.log('[ensureNumeric] Sample keys:', Object.keys(numericLib).slice(0, 10));
    
    if (typeof numericLib?.uncmin !== 'function') {
      throw new Error('numeric.uncmin not found in loaded module');
    }
    
    return numericLib;
  } catch (err) {
    console.error('[ensureNumeric] Failed to load numeric:', err);
    numericLoadError = err;
    throw err;
  }
}

const LEISURE_HOURS = 16;

export async function calOptimalWorkT(params = {}) {
  console.log('[calOptimalWorkTTTTTT] Starting...');

  let numeric;
  try {
    numeric = await ensureNumeric();
  } catch (err) {
    console.error('[calOptimalWorkT] Failed to load numeric:', err);
    throw new Error(`Cannot load numeric library: ${err.message}`);
  }

  console.log('[calOptimalWorkT] numeric loaded:', !!numeric, 'has uncmin:', typeof numeric?.uncmin);

  

  console.log('[calOptimalWorkT] numeric.uncmin is available, calling it...');

  // CRITICAL FIX: numeric.js uses eval() internally and expects 'numeric' to be global
  // Temporarily assign to globalThis so numeric.uncmin can find it
  const previousGlobal = globalThis.numeric;
  globalThis.numeric = numeric;

  // simple 2nd-order quadratic test problem
  // minimize f(x,y) = (x - 1)^2 + (y - 2)^2
  const calUtility = (t, wageRate, unearnedIncome, iWeight, hWeight) => {
    const income = wageRate * (LEISURE_HOURS - t) + unearnedIncome;
    return Math.pow(income, iWeight) * Math.pow(t, hWeight);
  };
  const {
    wageRate = 50,
    unearnedIncome = 100,
    iWeight = 1,
    hWeight = 1,
  } = params;
  
  const func = (t) => -calUtility(t, wageRate, unearnedIncome, iWeight, hWeight) ;

  const start = [9];
  console.log('[testOpt] Calling numeric.uncmin with input:', { wageRate, unearnedIncome, iWeight, hWeight });
  
  let result;
  try {
    result = numeric.uncmin(func, start);
    console.log('[testOpt] numeric.uncmin returned:', result);
  } catch (err) {
    console.error('[testOpt] numeric.uncmin threw error:', err);
    throw new Error(`numeric.uncmin failed: ${err.message || err}`);
  } finally {
    // Restore previous global state
    if (previousGlobal === undefined) {
      delete globalThis.numeric;
    } else {
      globalThis.numeric = previousGlobal;
    }
  }

  // robustly extract solution vector
  let solution = null;
  if (result && Array.isArray(result.solution)) solution = result.solution;
  else if (result && Array.isArray(result.x)) solution = result.x;
  else if (Array.isArray(result)) solution = result;

  const optT = Number.isFinite(solution?.[0]) ? solution[0] : start[0]; 
  const optValue = func([optT]);
  const workT = LEISURE_HOURS - optT;
  console.log('[0000000000000calOptimalWorkT] Optimal t:', optT, 'workT:', workT, 'optValue:', optValue);
  return {
    success: true,
    optimum: { workT: round(workT) },
    value: -optValue,
    numericResult: result,
    description: 'minimize (x-1)^2 + (y-2)^2'
  };
}


export async function testOpt(params = {}) {
  console.log('[calOptimalWorkT] Starting...');

  let numeric;
  try {
    numeric = await ensureNumeric();
  } catch (err) {
    console.error('[calOptimalWorkT] Failed to load numeric:', err);
    throw new Error(`Cannot load numeric library: ${err.message}`);
  }

  console.log('[calOptimalWorkT] numeric loaded:', !!numeric, 'has uncmin:', typeof numeric?.uncmin);

  

  console.log('[calOptimalWorkT] numeric.uncmin is available, calling it...');

  // CRITICAL FIX: numeric.js uses eval() internally and expects 'numeric' to be global
  // Temporarily assign to globalThis so numeric.uncmin can find it
  const previousGlobal = globalThis.numeric;
  globalThis.numeric = numeric;

  // simple 2nd-order quadratic test problem
  // minimize f(x,y) = (x - 1)^2 + (y - 2)^2
  const calUtility = (t, wageRate, unearnedIncome, iWeight, hWeight) => {
    const income = wageRate * (LEISURE_HOURS - t) + unearnedIncome;
    return Math.pow(income, iWeight) * Math.pow(t, hWeight);
  };
  const {
    wageRate = 50,
    unearnedIncome = 100,
    iWeight = 1,
    hWeight = 1,
  } = params;
  
  const func = (t) => -calUtility(t, wageRate, unearnedIncome, iWeight, hWeight) ;

  const start = [8];
  console.log('[testOpt] Calling numeric.uncmin with start:', start);
  
  let result;
  try {
    result = numeric.uncmin(func, start);
    console.log('[testOpt] numeric.uncmin returned:', result);
  } catch (err) {
    console.error('[testOpt] numeric.uncmin threw error:', err);
    throw new Error(`numeric.uncmin failed: ${err.message || err}`);
  } finally {
    // Restore previous global state
    if (previousGlobal === undefined) {
      delete globalThis.numeric;
    } else {
      globalThis.numeric = previousGlobal;
    }
  }

  // robustly extract solution vector
  let solution = null;
  if (result && Array.isArray(result.solution)) solution = result.solution;
  else if (result && Array.isArray(result.x)) solution = result.x;
  else if (Array.isArray(result)) solution = result;

  const optT = Number.isFinite(solution?.[0]) ? solution[0] : start[0]; 
  const optValue = func([optT]);
  const workT = LEISURE_HOURS - optT;
  return {
    success: true,
    optimum: { t: round(optT), workT: round(workT) },
    value: -optValue,
    numericResult: result,
    description: 'Optimize utility function'
  };
}

export async function generateSupplyCurve(params, yAxisMax, step = 5) {
  const {
    utility = 100,
    iWeight = 1,
    hWeight = 1,
    unearnedIncome = 100,
    wMin = 10,
    wMax = 100,
  } = params;

  const data = [];
  if (!(utility > 0) || !(iWeight > 0) || !(hWeight > 0)) {
    return data;
  }

  for (let wageRate = wMin; wageRate <= wMax; wageRate += step) {
    const result = await calOptimalWorkT({
      utility,
      iWeight,
      hWeight,
      unearnedIncome,
      wageRate,
    });
    
    if (result && result.success && result.optimum) {
      const workT = result.optimum.workT || 0;
      data.push([workT, wageRate]);
    }
  } 

  return data;
}

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

export async function computeSupplySeries(params, sharedOptions = {}) {
  const {
    autoYAxis = false,
    manualYMin = 0,
    manualYMax = 100,
  } = sharedOptions;

  const {
    wMin = 10,
    wMax = 100,
  } = params;

  // Y-axis is wage rate
  const yAxisMax = autoYAxis
    ? Math.ceil(wMax * 1.1)
    : Math.max(manualYMax ?? 0, (manualYMin ?? 0) + 100);
  const yAxisMin = autoYAxis ? Math.max(0, wMin - 10) : Math.max(manualYMin ?? 0, 0);

  const supplySeries = await generateSupplyCurve(params, yAxisMax);

  const series = [
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
    }
  ];
  
  return {
    series,
    axis: {
      min: yAxisMin,
      max: yAxisMax,
    },
    meta: {
      wageRange: `${wMin} - ${wMax}`,
    },
  };
}

function round(value) {
  return Number.parseFloat(value.toFixed(2));
}
