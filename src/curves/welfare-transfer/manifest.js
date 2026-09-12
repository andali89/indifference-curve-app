import Controls from './Controls.vue';
import ChartInfo from './ChartInfo.vue';
import { computeWelfareTransferSeries } from './logic.js';
import { UTILITY_DEFAULTS } from '../utilityModels.js';

export default {
  id: 'welfare-transfer',
  name: '福利制度与劳动供给',
  ControlsComponent: Controls,
  ChartInfoComponent: ChartInfo,
  defaultParams: {
    ...UTILITY_DEFAULTS,
    policyType: 'nail',
    wageRate: 50,
    maxBenefit: 200,
    reductionRate: 0.5,
    stage: 1,
    defaultYAxis: { min: 0, max: 1000 },
  },
  computeSeries: computeWelfareTransferSeries,
  axisLabels: {
    xLabel: '闲暇时间 (小时)',
    yLabel: '收入 / 消费 (元)',
  },
  chartTitle: '福利制度与劳动供给',
  holdEnabled: false,
};
