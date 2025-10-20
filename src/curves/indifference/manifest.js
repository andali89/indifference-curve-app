import Controls from './Controls.vue';
import ChartInfo from './ChartInfo.vue';
import { computeIndifferenceSeries } from './logic.js';
import { t } from 'numeric';

export default {
  id: 'indifference',
  name: '无差异曲线',
  ControlsComponent: Controls,
  ChartInfoComponent: ChartInfo,
  defaultParams: {
    iWeight: 1,
    hWeight: 1,
    wageRate: 10,
    unearnedIncome: 0,
    utility: 100,
    defaultYAxis: { min: 0, max: 1800 },
  },
  computeSeries: computeIndifferenceSeries,
  axisLabels: {
    xLabel: '闲暇时间 (小时)',
    yLabel: '收入 (元)',
  },
  chartTitle: '闲暇-收入曲线分析',
  holdEnabled: true,  // Enable "Hold previous curve" feature
};
