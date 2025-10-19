<template>
  <div class="curves-app">
    <button
      class="sidebar-toggle"
      :class="{ 'sidebar-toggle--expanded': sidebarVisible }"
      type="button"
      @click="sidebarVisible = !sidebarVisible"
    >
      <span v-if="sidebarVisible">◀</span>
      <span v-else>▶</span>
    </button>

    <aside
      v-show="sidebarVisible"
      class="sidebar"
      :style="{ width: `${sidebarWidth}px` }"
    >
      <div class="sidebar-header">
        <h2>{{ activeCurve.name }}分析</h2>
      </div>

      <CurveSelector :curves="curves" v-model="selectedCurveId" />

      <CurvePanel
        :key="selectedCurveId"
        :curve="activeCurve"
        :modelValue="activeParams"
        @update:modelValue="updateActiveParams"
      />

      <SharedControls
        :modelValue="sharedControls"
        @update:modelValue="applySharedControls"
      />

      <button
        v-if="sharedControls.hold && heldSeries.length"
        class="clear-held"
        type="button"
        @click="clearHeldSeries()"
      >
        清除保留曲线 ({{ heldSeries.length }})
      </button>

      

      <div
        class="resize-handle"
        @mousedown.prevent="startResize"
        @touchstart.prevent="startResize"
      ></div>
    </aside>

    <ChartArea
      class="curves-app__chart"
      :series="displaySeries"
      :yAxis="yAxisRange"
      :sharedControls="sharedControls"
      :chartMeta="chartMeta"
    />
    
  </div>
  <Footer />
</template>

<script setup>
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import CurveSelector from '../components/CurveSelector.vue';
import SharedControls from '../components/SharedControls.vue';
import CurvePanel from '../components/CurvePanel.vue';
import ChartArea from '../components/ChartArea.vue';
import Footer from '../components/Footer.vue';
import { useCurveRegistry } from '../composables/useCurveRegistry.js';
import { useSidebarResize } from '../composables/useSidebarResize.js';
import { useHoldStack } from '../composables/useHoldStack.js';

const { curves, getCurve } = useCurveRegistry();
const selectedCurveId = ref('');
const activeParams = reactive({});
const sharedControls = reactive({
  hold: false,
  autoYAxis: false,
  manualYMin: 0,
  manualYMax: 0,
  chartPadding: 20,
  viewMode: 'normal',
  aspectRatioPreset: 'auto',
  aspectWidth: 16,
  aspectHeight: 9,
  defaultYAxis: {min: 0, max: 1200},
});

const sidebarVisible = ref(true);
const { sidebarWidth, startResize } = useSidebarResize({
  initialWidth: 320,
  minWidth: 220,
  maxWidth: 720,
});

const { heldSeries, push: pushHeldSeries, clear: clearHeldSeries } = useHoldStack();

const currentResult = ref(null);
const lastParams = ref(null);
const yAxisRange = ref({ min: 0, max: 1200 });
const chartMeta = ref({});
const lastRecompute = ref(null);

function applySharedControls(next) {
  if (!next || typeof next !== 'object') {
    return;
  }
  Object.assign(sharedControls, next);
}

function resetActiveParams(defaults = {}) {
  Object.keys(activeParams).forEach((key) => {
    delete activeParams[key];
  });
  Object.assign(activeParams, defaults);
}

function updateActiveParams(next) {
  if (!next || typeof next !== 'object') {
    return;
  }
  Object.assign(activeParams, next);
  console.log('[CurvesPage] activeParams updated:', { ...activeParams });
}

watchEffect(() => {
  if (!selectedCurveId.value && curves.value.length) {
    selectedCurveId.value = curves.value[0].id;
  }
});

const activeCurve = computed(() => getCurve(selectedCurveId.value));

// ...existing code...
watch(selectedCurveId, (newId, oldId) => {
  const curve = getCurve(newId);
  if (!curve) return;
  // 初始化参数与 y 轴等（深拷贝）
  resetActiveParams(cloneParams(curve.defaultParams || {}));
  sharedControls.defaultYAxis = cloneParams(
    curve.defaultYAxis ?? curve.defaultParams?.defaultYAxis ?? { min: 0, max: 1200 }
  );
  sharedControls.manualYMax = sharedControls.defaultYAxis.max;
  sharedControls.manualYMin = sharedControls.defaultYAxis.min;
  console.log('[CurvesPage] Selected curve changed:', newId, curve);
  // 其它初始化与首次绘图
  clearHeldSeries();
  currentResult.value = null;
  lastParams.value = null;
  recompute();
}, { immediate: true });

watch(
  activeCurve,
  (curve) => {
    if (!curve) return;
    resetActiveParams(curve.defaultParams || {});
    clearHeldSeries();
    currentResult.value = null;
    lastParams.value = null;
    recompute();

  },
  { immediate: true }
);

watch(
  () => sharedControls.hold,
  (enabled) => {
    if (!enabled) {
      clearHeldSeries();
    }
  }
);

watch(
  [
    selectedCurveId,
    () => sharedControls.autoYAxis,
    () => sharedControls.manualYMin,
    () => sharedControls.manualYMax,
  ],
  () => {
    recompute();
  },
  { immediate: true }
);

watch(
  activeParams,
  () => {
    recompute();
  },
  { deep: true, immediate: true }
);

const displaySeries = computed(() => {
  const resultSeries = currentResult.value?.series ?? [];
  return [...heldSeries.value, ...resultSeries];
});

function recompute() {
  const curve = activeCurve.value;
  if (!curve || typeof curve.computeSeries !== 'function') {
    return;
  }

  const clonedParams = cloneParams(activeParams);
  
  maybeAddHeldSeries(clonedParams);

  const result = curve.computeSeries(clonedParams, {
    autoYAxis: sharedControls.autoYAxis,
    manualYMin: sharedControls.manualYMin,
    manualYMax: sharedControls.manualYMax,
  });

  console.log('sharedControls.autoYAxis:', sharedControls.autoYAxis);
  currentResult.value = result;
  console.log('[11111111] currentResult:', currentResult.value);
  chartMeta.value = result?.meta || {};
  yAxisRange.value = result?.axis || { min: 0, max: 1200 };
  console.log('yAxisRange:', yAxisRange.value);
  lastParams.value = clonedParams;
  lastRecompute.value = new Date().toISOString();
}

function maybeAddHeldSeries(nextParams) {
  if (!sharedControls.hold) return;
  if (!currentResult.value || !lastParams.value) return;

  const prevParams = lastParams.value;
  const nextUtility = Number(nextParams.utility ?? 0);
  const prevUtility = Number(prevParams.utility ?? 0);
  if (Math.abs(nextUtility - prevUtility) < 100) return;

  const holdable = (currentResult.value?.series || []).filter(
    (series) => series?.meta?.holdEligible
  );
  if (!holdable.length) return;
  pushHeldSeries(holdable);
}

function cloneParams(source) {
  return JSON.parse(JSON.stringify(source || {}));
}



</script>

<style scoped>
.curves-app {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e0f2fe 100%);
  position: relative;
}

.sidebar-toggle {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translate(0, -50%);
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #d2d2d7;
  border-left: none;
  border-radius: 0 8px 8px 0;
  padding: 12px 8px;
  cursor: pointer;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  font-size: 14px;
  color: #1d1d1f;
}

.sidebar-toggle--expanded {
  transform: translate(-12px, -50%);
}

.sidebar {
  min-width: 200px;
  max-width: 700px;
  background: white;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s ease;
}

.sidebar-header {
  background: linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%);
  color: #1d1d1f;
  padding: 30px 25px 30px 36px;
  text-align: center;
  border-bottom: 1px solid #d2d2d7;
}

.sidebar-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  opacity: 0.7;
  color: #86868b;
}

.clear-held {
  margin: 0 36px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(14, 165, 164, 0.2);
  background: rgba(14, 165, 164, 0.08);
  color: #0a5c56;
  cursor: pointer;
  transition: background 0.2s ease;
}

.clear-held:hover {
  background: rgba(14, 165, 164, 0.15);
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: rgba(14, 165, 164, 0.12);
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 40px;
  background: #d2d2d7;
  border-radius: 2px;
}

.curves-app__chart {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 900px) {
  .curves-app {
    flex-direction: column;
  }

  .sidebar-toggle {
    top: auto;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 0);
  }

  .sidebar-toggle--expanded {
    transform: translate(-50%, 0) rotate(180deg);
  }

  .sidebar {
    width: 100% !important;
    max-height: 55vh;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .resize-handle {
    display: none;
  }
}

.debug-panel {
  position: fixed;
  right: 12px;
  bottom: 12px;
  background: rgba(255,255,255,0.95);
  border: 1px solid #e6e6e6;
  padding: 12px;
  font-size: 12px;
  max-width: 320px;
  max-height: 320px;
  overflow: auto;
  z-index: 9999;
}
</style>
