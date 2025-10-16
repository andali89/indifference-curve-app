import { computed } from 'vue';
import indifferenceCurve from '../curves/indifference/manifest.js';

const registry = [indifferenceCurve];

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
