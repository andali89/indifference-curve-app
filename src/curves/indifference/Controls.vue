<template>
  <div class="indifference-controls">
    <section class="control-section">
      <h3>效用函数参数</h3>
      <div class="control-grid">
        <div class="control-item">
          <label for="i-weight">收入权重 (I)</label>
          <input
            id="i-weight"
            type="number"
            min="0.1"
            step="0.1"
            v-model.number="local.iWeight"
          />
        </div>
        <div class="control-item">
          <label for="h-weight">闲暇权重 (H)</label>
          <input
            id="h-weight"
            type="number"
            min="0.1"
            step="0.1"
            v-model.number="local.hWeight"
          />
        </div>
      </div>
      <div class="formula">U = I<sup>{{ local.iWeight }}</sup> × H<sup>{{ local.hWeight }}</sup></div>
    </section>

    <section class="control-section">
      <h3>预算约束参数</h3>
      <div class="control-item">
        <label for="unearned-income">非劳动收入</label>
        <div class="input-with-unit">
          <input
            id="unearned-income"
            type="number"
            min="0"
            step="50"
            v-model.number="local.unearnedIncome"
          />
          <span class="unit">元</span>
        </div>
      </div>
      <div class="control-item">
        <label for="wage-rate">工资率</label>
        <div class="input-with-unit">
          <input
            id="wage-rate"
            type="number"
            min="0"
            step="10"
            v-model.number="local.wageRate"
          />
          <span class="unit">元/小时</span>
        </div>
      </div>
    </section>

    <section class="control-section">
      <h3>效用水平</h3>
      <div class="utility-wrapper">
        <label for="utility-value">效用值</label>
        <div class="utility-entry">
          <input
            id="utility-value"
            class="utility-input"
            type="text"
            inputmode="numeric"
            :value="inputValue"
            :aria-invalid="Boolean(utilityError)"
            :aria-describedby="utilityError ? 'utility-error' : undefined"
            @input="onUtilityInput"
            @keydown.enter.prevent="applyUtility"
            @keydown.esc.prevent="cancelUtility"
          />
          <button type="button" class="utility-apply" :disabled="!hasDraftChange" @click="applyUtility">应用</button>
        </div>
        <p v-if="utilityError" id="utility-error" class="utility-error" role="alert">{{ utilityError }}</p>
        <p v-else-if="sliderPreviewing" class="utility-hint">正在预览 U={{ sliderValue }}；松开滑块或按 Enter 后应用</p>
        <p v-else-if="hasDraftChange" class="utility-hint">待应用：图中仍显示 U={{ committedUtility }}</p>
        <input
          class="utility-slider"
          type="range"
          min="100"
          max="100000"
          step="1"
          :value="sliderValue"
          aria-label="效用水平滑块"
          @input="previewSlider"
          @change="onSliderChange"
          @pointerdown="sliderKeyboardEditing = false"
          @pointercancel="cancelSlider"
          @keydown="onSliderKeydown"
          @blur="finishSlider"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      iWeight: 1,
      hWeight: 1,
      wageRate: 10,
      unearnedIncome: 0,
      utility: 100,
    }),
  },
});

const emit = defineEmits(['update:modelValue', 'commit:utility', 'preview:utility', 'cancel:utility-preview']);

const local = reactive({ ...props.modelValue });
const committedUtility = computed(() => Number(props.modelValue.utility ?? 100));
const inputValue = ref(String(committedUtility.value));
const sliderValue = ref(committedUtility.value);
const utilityError = ref('');
const sliderKeyboardEditing = ref(false);
const sliderPreviewing = ref(false);
const hasDraftChange = computed(() => inputValue.value !== String(committedUtility.value));

watch(committedUtility, (value) => {
  inputValue.value = String(value);
  sliderValue.value = value;
  utilityError.value = '';
  sliderPreviewing.value = false;
});

function onUtilityInput(event) {
  inputValue.value = event.target.value;
  utilityError.value = '';
}

function parseUtility(text) {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isSafeInteger(number) && number >= 100 && number <= 100000 ? number : null;
}

function applyUtility() {
  const next = parseUtility(inputValue.value);
  if (next === null) {
    utilityError.value = '请输入 100 至 100000 之间的整数。';
    return;
  }
  utilityError.value = '';
  if (next === committedUtility.value) {
    inputValue.value = String(next);
    return;
  }
  emit('commit:utility', next);
}

function cancelUtility() {
  inputValue.value = String(committedUtility.value);
  utilityError.value = '';
}

function previewSlider(event) {
  setSliderPreview(Number(event.target.value));
}

function setSliderPreview(next) {
  sliderValue.value = next;
  inputValue.value = String(next);
  utilityError.value = '';
  sliderPreviewing.value = true;
  emit('preview:utility', next);
}

function onSliderKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelSlider();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    finishSlider();
  } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    sliderKeyboardEditing.value = true;
    const delta = { ArrowLeft: -10, ArrowDown: -10, ArrowRight: 10, ArrowUp: 10, PageDown: -100, PageUp: 100 }[event.key] ?? 0;
    const next = event.key === 'Home' ? 100 : event.key === 'End' ? 100000 : sliderValue.value + delta;
    setSliderPreview(Math.max(100, Math.min(100000, next)));
  }
}

function cancelSlider() {
  sliderPreviewing.value = false;
  sliderKeyboardEditing.value = false;
  sliderValue.value = committedUtility.value;
  cancelUtility();
  emit('cancel:utility-preview');
}

function onSliderChange() {
  if (!sliderKeyboardEditing.value) finishSlider();
}

function finishSlider() {
  if (!sliderPreviewing.value) return;
  sliderPreviewing.value = false;
  sliderKeyboardEditing.value = false;
  if (sliderValue.value !== committedUtility.value) {
    emit('commit:utility', sliderValue.value);
  } else {
    emit('cancel:utility-preview');
  }
}

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(local, value || {});
  },
  { deep: true }
);

watch(
  local,
  (value) => {
    const clone = { ...value };
    clone.utility = committedUtility.value;
    if (!(clone.iWeight > 0)) {
      clone.iWeight = 0.1;
      local.iWeight = 0.1;
    }
    if (!(clone.hWeight > 0)) {
      clone.hWeight = 0.1;
      local.hWeight = 0.1;
    }
    emit('update:modelValue', clone);
  },
  { deep: true }
);
</script>

<style scoped>
.indifference-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

input[type='number'] {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  font-size: 14px;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-with-unit input {
  flex: 1;
}

.unit {
  font-size: 13px;
  color: #666;
  min-width: 50px;
}

.formula {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  background: linear-gradient(135deg, #89c0c0 0%, #89c0c0 100%);
  font-weight: 700;
  color: #333;
}

.utility-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.utility-entry {
  display: flex;
  gap: 8px;
}

.utility-input {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 2px solid #e8efee;
  border-radius: 10px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  color: #0ea5a4;
  background: linear-gradient(180deg, #fbfffe 0%, #f7fffd 100%);
}

.utility-apply {
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: #0ea5a4;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.utility-apply:disabled {
  opacity: 0.5;
  cursor: default;
}

.utility-error, .utility-hint {
  margin: 0;
  font-size: 12px;
}

.utility-error { color: #b91c1c; }
.utility-hint { color: #555; }

.utility-slider {
  width: 100%;
}

@media (max-width: 900px) {
  .control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
