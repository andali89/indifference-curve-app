import { ref } from 'vue';

let counter = 0;

export function useHoldStack() {
  const heldSeries = ref([]);

  function push(seriesItems = []) {
    const normalized = Array.isArray(seriesItems) ? seriesItems : [seriesItems];
    const clones = normalized
      .filter(Boolean)
      .map((item) => {
        counter += 1;
        const nameSuffix = ` (保留 ${counter})`;
        const baseLineStyle = item.lineStyle || {};
        return {
          ...item,
          id: item.id ?? `held-${counter}`,
          name: (item.name || '曲线') + nameSuffix,
          lineStyle: {
            ...baseLineStyle,
            width: 2,
            type: 'dashed',
            color: '#9ca3af',
          },
          emphasis: {
            focus: 'series',
          },
          meta: {
            ...(item.meta || {}),
            holdEligible: false,
          },
        };
      });

    if (!clones.length) return;
    heldSeries.value = [...heldSeries.value, ...clones];
  }

  function clear() {
    heldSeries.value = [];
  }

  function remove(id) {
    heldSeries.value = heldSeries.value.filter((item) => item.id !== id);
  }

  return {
    heldSeries,
    push,
    clear,
    remove,
  };
}
