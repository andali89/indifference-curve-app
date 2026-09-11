<template>
  <div class="wage-effects-controls">
    <section class="control-section">
      <h3>工资变化</h3>
      <div class="control-grid">
        <div class="control-item">
          <label for="initial-wage">初始工资率</label>
          <div class="input-with-unit">
            <input
              id="initial-wage"
              type="number"
              min="1"
              step="10"
              v-model.number="local.initialWage"
            />
            <span class="unit">元/小时</span>
          </div>
        </div>

        <div class="control-item">
          <label for="new-wage">新工资率</label>
          <div class="input-with-unit">
            <input
              id="new-wage"
              type="number"
              min="1"
              step="10"
              v-model.number="local.newWage"
            />
            <span class="unit">元/小时</span>
          </div>
        </div>
      </div>
    </section>

    <section class="control-section">
      <h3>演示步骤</h3>
      <div class="stage-buttons">
        <button
          v-for="item in stages"
          :key="item.value"
          type="button"
          class="stage-button"
          :class="{ 'stage-button--active': local.stage === item.value }"
          @click="local.stage = item.value"
        >
          {{ item.label }}
        </button>
      </div>
      <p class="stage-description">{{ activeStageDescription }}</p>
    </section>

    <section class="assumption-card">
      <div><strong>效用函数：</strong>U = I × H</div>
      <div><strong>可支配时间：</strong>16 小时</div>
      <div><strong>非劳动收入：</strong>100 元</div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      initialWage: 50,
      newWage: 100,
      stage: 1,
    }),
  },
});

const emit = defineEmits(['update:modelValue']);

const stages = [
  { value: 1, label: '1 初始状态', description: '先观察初始预算线、无差异曲线与最优点 A。' },
  { value: 2, label: '2 工资变化', description: '加入新预算线与新最优点 C，观察工资变化后的总效应。' },
  { value: 3, label: '3 效应分解', description: '加入 Hicks 补偿线与点 B，将总效应分解为替代效应和收入效应。' },
];

const local = reactive({ ...props.modelValue });

const activeStageDescription = computed(() => {
  return stages.find((item) => item.value === local.stage)?.description || stages[0].description;
});

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

    if (!(clone.initialWage > 0)) {
      clone.initialWage = 1;
      local.initialWage = 1;
    }
    if (!(clone.newWage > 0)) {
      clone.newWage = 1;
      local.newWage = 1;
    }
    if (![1, 2, 3].includes(clone.stage)) {
      clone.stage = 1;
      local.stage = 1;
    }

    emit('update:modelValue', clone);
  },
  { deep: true }
);
</script>

<style scoped>
.wage-effects-controls {
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

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-with-unit input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  font-size: 14px;
}

.unit {
  min-width: 50px;
  font-size: 13px;
  color: #666;
}

.stage-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stage-button {
  padding: 10px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: #fff;
  color: #333;
  text-align: left;
  cursor: pointer;
}

.stage-button--active {
  border-color: #0f766e;
  background: #f0fdfa;
  color: #0f766e;
  font-weight: 600;
}

.stage-description {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #666;
}

.assumption-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
