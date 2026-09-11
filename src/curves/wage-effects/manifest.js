import Controls from './Controls.vue';
import ChartInfo from './ChartInfo.vue';
import { computeWageEffectsSeries } from './logic.js';

export default {
  id: 'wage-effects',
  name: '收入效应与替代效应',
  ControlsComponent: Controls,
  ChartInfoComponent: ChartInfo,
  defaultParams: {
    initialWage: 50,
    newWage: 100,
    stage: 1,
    defaultYAxis: { min: 0, max: 2000 },
  },
  computeSeries: computeWageEffectsSeries,
  axisLabels: {
    xLabel: '闲暇时间 (小时)',
    yLabel: '收入 (元)',
  },
  chartTitle: '工资变化的收入效应与替代效应',
  holdEnabled: false,
};
