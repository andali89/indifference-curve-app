import Controls from './Controls.vue';
import { computeIndifferenceSeries } from './logic.js';

export default {
  id: 'indifference_test',
  name: '无差异曲线（测试）',
  ControlsComponent: Controls,
  defaultParams: {
    iWeight: 1,
    hWeight: 1,
    wageRate: 10,
    unearnedIncome: 0,
    utility: 100,
    defaultYAxis: { min: 0, max: 2000 },
  },
  computeSeries: computeIndifferenceSeries,
};
