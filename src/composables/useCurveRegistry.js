import { computed } from 'vue';
import indifferenceCurve from '../curves/indifference/manifest.js';
import wageEffectsCurve from '../curves/wage-effects/manifest.js';
import welfareTransferCurve from '../curves/welfare-transfer/manifest.js';
import supplyCurve from '../curves/supply-curve/manifest.js';

const registry = [indifferenceCurve, wageEffectsCurve, welfareTransferCurve, supplyCurve];

export function useCurveRegistry() {
  const curves = computed(() => registry);

  function getCurve(id) {
    return registry.find((item) => item.id === id) ?? null;
  }

  return {
    curves,
    getCurve,
  };
}
