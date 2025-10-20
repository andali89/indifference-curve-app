import { ensureNumeric } from '../indifference_test/logic.js';

export async function computeSupplySeries(params) {
  // simple placeholder series that maps wage to optimal labor
  const { wMin = 10, wMax = 100 } = params;
  const wages = [];
  const works = [];
  for (let w = wMin; w <= wMax; w += Math.max(1, Math.floor((wMax - wMin) / 50))) {
    wages.push(w);
    // naive: more wage -> more labor (placeholder)
    works.push(Math.max(0, Math.min(16, (w - wMin) / (wMax - wMin) * 16)));
  }

  return {
    series: [
      {
        name: '劳动供给',
        data: wages.map((w, i) => [works[i], w]),
      },
    ],
    axisMeta: { xLabel: '劳动时间 (小时)', yLabel: '工资率 (元/小时)' },
    chartMeta: { wageRange: [wMin, wMax], utility: params.utility },
  };
}
