import Controls from './Controls.vue';
import { computeIndifferenceSeries } from './logic.js';

export default {
  id: 'indifference',
  name: '无差异曲线',
  ControlsComponent: Controls,
  defaultParams: {
    iWeight: 1,
    hWeight: 1,
    wageRate: 10,
    unearnedIncome: 0,
    utility: 100,
  },
  computeSeries: computeIndifferenceSeries,
};
