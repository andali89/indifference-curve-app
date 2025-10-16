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
        <input
          class="utility-input"
          type="number"
          min="100"
          step="10"
          v-model.number="local.utility"
        />
        <input
          class="utility-slider"
          type="range"
          min="100"
          max="100000"
          v-model.number="local.utility"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

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

const emit = defineEmits(['update:modelValue']);

const local = reactive({ ...props.modelValue });

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
    if (!(clone.utility >= 100)) {
      clone.utility = 100;
      local.utility = 100;
    }
    if (!(clone.iWeight > 0)) {
      clone.iWeight = 0.1;
      local.iWeight = 0.1;
    }
    if (!(clone.hWeight > 0)) {
      clone.hWeight = 0.1;
      local.hWeight = 0.1;
    }
    console.log('[Controls] emit update:modelValue', clone);
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

.utility-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e8efee;
  border-radius: 10px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  color: #0ea5a4;
  background: linear-gradient(180deg, #fbfffe 0%, #f7fffd 100%);
}

.utility-slider {
  width: 100%;
}

@media (max-width: 900px) {
  .control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
