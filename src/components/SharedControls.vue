<template>
  <section class="shared-controls">
    <h3 class="section-title">图表通用设置</h3>

    <div v-if="props.holdEnabled" class="control-group checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" v-model="local.hold" />
        <span>保持之前的曲线 (Hold)</span>
      </label>
    </div>

    <div class="control-group checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" v-model="local.autoYAxis" />
        <span>自动调整 Y 轴范围</span>
      </label>
    </div>

    <div v-if="!local.autoYAxis" class="axis-manual-controls">
      <div class="control-pair">
        <label for="y-min">Y 轴最小值</label>
        <input
          id="y-min"
          type="number"
          v-model.number="local.manualYMin"
          min="0"
          step="10"
        />
      </div>
      <div class="control-pair">
        <label for="y-max">Y 轴最大值</label>
        <input
          id="y-max"
          type="number"
          v-model.number="local.manualYMax"
          min="100"
          step="50"
        />
      </div>
    </div>

    <div class="control-group">
      <label for="chart-padding">图表内边距</label>
      <div class="slider-with-value">
        <input
          id="chart-padding"
          type="range"
          min="10"
          max="60"
          step="5"
          v-model.number="local.chartPadding"
        />
        <span class="value-display">{{ local.chartPadding }} px</span>
      </div>
    </div>

    <div class="control-group view-mode-group">
      <label>视图模式</label>
      <div class="view-mode-buttons">
        <button
          type="button"
          :class="{ active: local.viewMode === 'normal' }"
          @click="setViewMode('normal')"
        >
          标准
        </button>
        <button
          type="button"
          :class="{ active: local.viewMode === 'wide' }"
          @click="setViewMode('wide')"
        >
          宽屏
        </button>
      </div>
    </div>

    <div class="control-group">
      <label>图表宽高比</label>
      <select v-model="local.aspectRatioPreset">
        <option value="auto">自适应</option>
        <option value="16:9">16:9 (宽屏)</option>
        <option value="4:3">4:3 (标准)</option>
        <option value="1:1">1:1 (正方形)</option>
        <option value="custom">自定义</option>
      </select>
      <div v-if="local.aspectRatioPreset === 'custom'" class="custom-aspect">
        <input
          type="number"
          v-model.number="local.aspectWidth"
          min="1"
          step="1"
          aria-label="Aspect Width"
        />
        <span>:</span>
        <input
          type="number"
          v-model.number="local.aspectHeight"
          min="1"
          step="1"
          aria-label="Aspect Height"
        />
      </div>
    </div>

    <button type="button" class="reset-button" @click="reset">
      重置通用设置
    </button>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';

function createDefaultState() {
  
  return {
    hold: false,
    autoYAxis: false,
    manualYMin: 0,
    manualYMax: 1200,
    chartPadding: 20,
    viewMode: 'normal',
    aspectRatioPreset: 'auto',
    aspectWidth: 16,
    aspectHeight: 9,
  };
}

const props = defineProps({
  modelValue: {
    type: Object,
  },
  holdEnabled: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const local = reactive({ ...createDefaultState(), ...(props.modelValue || {}) });

watch(
  () => props.modelValue,
  (value) => {
    if (!value) return;
  Object.assign(local, createDefaultState(), value || {});
  },
  { deep: true }
);

watch(
  local,
  (value) => {
    const payload = { ...value };
    if (payload.manualYMax <= payload.manualYMin) {
      payload.manualYMax = payload.manualYMin + 100;
    }
    emit('update:modelValue', payload);
  },
  { deep: true }
);

// When user selects a preset like '16:9', populate numeric aspectWidth/aspectHeight
watch(
  () => local.aspectRatioPreset,
  (preset) => {
    if (!preset) return;
    if (preset === 'custom' || preset === 'auto') return;
    const parts = String(preset).split(':');
    if (parts.length === 2) {
      const w = Number(parts[0]) || local.aspectWidth || 16;
      const h = Number(parts[1]) || local.aspectHeight || 9;
      local.aspectWidth = w;
      local.aspectHeight = h;
      emit('update:modelValue', { ...local });
    }
  }
);

function setViewMode(mode) {
  local.viewMode = mode;
}


function resetDefaultState() {
  const state = createDefaultState();
  state.manualYMax = local.defaultYAxis.max;
  state.manualYMin = local.defaultYAxis.min;
  return state;
}

function reset() {
  Object.assign(local, resetDefaultState());
}
</script>

<style scoped>
.shared-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 25px 20px 36px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-group {
  margin-top: 4px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #0ea5a4;
}

.axis-manual-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.control-pair {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-pair input[type='number'] {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  font-size: 14px;
  box-sizing: border-box;
}

.slider-with-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-with-value input[type='range'] {
  flex: 1;
}

.value-display {
  min-width: 56px;
  text-align: right;
  font-size: 13px;
  color: #666;
}

.view-mode-group {
  gap: 12px;
}

.view-mode-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.view-mode-buttons button {
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #1d1d1f;
  transition: all 0.2s ease;
}

.view-mode-buttons button.active {
  background: #0ea5a4;
  color: #fff;
  border-color: #0ea5a4;
}

.view-mode-buttons button:hover {
  border-color: #0ea5a4;
}

select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  background: #fff;
  font-size: 14px;
}

.custom-aspect {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.custom-aspect input[type='number'] {
  width: 64px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #d2d2d7;
}

.reset-button {
  padding: 10px;
  border-radius: 6px;
  background: #f6fffd;
  border: 1px solid rgba(14, 165, 164, 0.12);
  font-size: 13px;
  color: #0a5c56;
  cursor: pointer;
  transition: background 0.2s ease;
}

.reset-button:hover {
  background: rgba(14, 165, 164, 0.18);
}

@media (max-width: 900px) {
  .shared-controls {
    padding: 20px;
  }
}
</style>
