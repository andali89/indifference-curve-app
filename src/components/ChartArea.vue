<template>
  <div
    class="chart-area"
    :class="[
      sharedControls.viewMode === 'wide' ? 'chart-area--wide' : 'chart-area--normal',
      { 'chart-area--fullscreen': isFullscreen }
    ]"
    ref="chartAreaRef"
  >
    <div class="chart-header">
      <div>
        <h1 class="chart-title">闲暇-收入曲线分析</h1>
        <div class="chart-info">
          <span class="info-chip">最大闲暇时间：16 小时</span>
          <span class="info-chip">16 小时收入：{{ chartMeta.maxIncome?.toFixed?.(0) ?? 0 }} 元</span>
          <span v-if="sharedControls.viewMode === 'wide'" class="info-chip">宽屏模式</span>
        </div>
      </div>
      <button class="fullscreen-toggle" type="button" @click="toggleFullscreen">
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </button>
    </div>

    <div class="chart-container" ref="chartContainerRef">
      <div
        class="chart-wrapper"
        :class="{ 'chart-wrapper--fixed': isAspectMode }"
        :style="wrapperStyle"
      >
        <v-chart class="chart" :option="chartOption" autoresize />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useChartOptions } from '../composables/useChartOptions.js';
import { useFullscreen } from '../composables/useFullscreen.js';




const props = defineProps({
  series: {
    type: Array,
    default: () => [],
  },
  yAxis: {
    type: Object,
    default: () => ({ min: 0, max: 1200 }),
  },
  sharedControls: {
    type: Object,
    required: true,
  },
  chartMeta: {
    type: Object,
    default: () => ({}),
  },
});






const chartAreaRef = ref(null);
const chartContainerRef = ref(null);
const containerWidth = ref(0);
const containerHeight = ref(0);
let resizeObserver;
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(chartAreaRef);

const filteredSeries = computed(() =>
  (props.series || []).map((item) => {
    const { meta, ...rest } = item || {};
    return rest;
  })
);

// Wrap yAxis in computed to ensure reactivity when parent updates it
const yAxisComputed = computed(() => props.yAxis);

const chartOption = useChartOptions(filteredSeries, yAxisComputed, props.sharedControls);

const isAspectMode = computed(() => props.sharedControls.aspectRatioPreset !== 'auto');


// Calculate optimal size to fit container while maintaining aspect ratio
const chartDimensions = computed(() => {
  
  const preset = props.sharedControls?.aspectRatioPreset ?? 'auto';
  if (preset === 'auto') {
    return null;
  }
  console.log('[ChartArea] chartDimensions: aspect mode', {
    preset: props.sharedControls.aspectRatioPreset,
    ratio: `${props.sharedControls.aspectWidth}:${props.sharedControls.aspectHeight}`,
    container: `${containerWidth.value}x${containerHeight.value}`
  });
  const padding = (props.sharedControls && typeof props.sharedControls.chartPadding === 'number')
    ? props.sharedControls.chartPadding * 2
    : 20;
  const minWidth = 400;  // 最小宽度
  const minHeight = 300; // 最小高度
  
  // 可用空间（扣除 padding）
  const availableWidth = containerWidth.value - padding;
  const availableHeight = containerHeight.value - padding;
  
  // 目标宽高比
  const aspectWidth = props.sharedControls.aspectWidth;
  const aspectHeight = props.sharedControls.aspectHeight;
  const targetRatio = aspectWidth / aspectHeight;
  
  // 根据宽度计算高度
  let width = availableWidth;
  let height = width / targetRatio;
  
  // 如果高度超出，则根据高度计算宽度
  if (height > availableHeight) {
    height = availableHeight;
    width = height * targetRatio;
  }
  
  // 确保不小于最小尺寸
  if (width < minWidth) {
    width = minWidth;
    height = width / targetRatio;
  }
  if (height < minHeight) {
    height = minHeight;
    width = height * targetRatio;
  }
  
  return {
    width: Math.floor(width),
    height: Math.floor(height)
  };
});

const wrapperStyle = computed(() => {
  const paddingVal = (props.sharedControls && typeof props.sharedControls.chartPadding === 'number')
    ? props.sharedControls.chartPadding
    : 20;

  const baseStyle = {
    padding: `${paddingVal}px`,
    boxSizing: 'border-box',
    transformOrigin: 'center center'
  };

  const preset = props.sharedControls?.aspectRatioPreset ?? 'auto';
  if (preset !== 'auto' && chartDimensions.value) {
    return {
      ...baseStyle,
      width: `${chartDimensions.value.width}px`,
      height: `${chartDimensions.value.height}px`,
      maxWidth: '100%',
      maxHeight: '100%',
      margin: 'auto',
      flexShrink: 0
    };
  }

  return {
    ...baseStyle,
    flex: '1 1 auto',
    height: '100%',
    width: '100%'
  };
});


function updateContainerSize() {
  if (!chartContainerRef.value) return;
  const rect = chartContainerRef.value.getBoundingClientRect();
  containerWidth.value = rect.width;
  containerHeight.value = rect.height;
}

onMounted(() => {
  updateContainerSize();
  resizeObserver = new ResizeObserver(() => updateContainerSize());
  if (chartContainerRef.value) {
    resizeObserver.observe(chartContainerRef.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver && chartContainerRef.value) {
    resizeObserver.unobserve(chartContainerRef.value);
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
.chart-area {
  display: flex;
  flex-direction: column;
  padding: 30px;
  transition: all 0.3s ease;
  min-height: 0;
  min-width: 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #e0f2fe 100%);
}

.chart-area--wide {
  padding: 20px 50px;
}

.chart-area--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 40px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}

.chart-title {
  margin: 0 0 12px;
  font-size: 32px;
  color: #333;
  font-weight: 700;
}

.chart-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.info-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfffe 0%, #f0fffb 100%);
  color: #0b6b63;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(6, 128, 116, 0.12);
}

.fullscreen-toggle {
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #d2d2d7;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fullscreen-toggle:hover {
  border-color: #0ea5a4;
  color: #0ea5a4;
}

.chart-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.chart-wrapper {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-wrapper--fixed {
  flex: 0 0 auto;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 320px;
}

@media (max-width: 900px) {
  .chart-area {
    padding: 20px;
  }

  .chart-area--wide {
    padding: 20px;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .fullscreen-toggle {
    align-self: flex-end;
  }
}
</style>
