import Controls from './Controls.vue';
import ChartInfo from './ChartInfo.vue';
import { computeSupplySeries } from './logic.js';

export default {
  id: 'supply-curve',
  name: '个人劳动供给曲线',
  ControlsComponent: Controls,
  ChartInfoComponent: ChartInfo,
  defaultParams: {
    iWeight: 1,
    hWeight: 2,
    unearnedIncome: 100,
    utility: 100,
    wMin: 10,
    wMax: 100,
    defaultYAxis: { min: 0, max: 120 },
  },
  computeSeries: computeSupplySeries,
  axisLabels: {
    xLabel: '劳动时间 (小时)',
    yLabel: '工资率 (元/小时)',
  },
  chartTitle: '劳动供给曲线分析',
  holdEnabled: false,  // Enable "Hold previous curve" feature
};
