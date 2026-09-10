<template>
  <div class="chart-info">
    <span class="info-chip">效用函数：{{ utilityModelName }}</span>
    <span class="info-chip">工资率范围：{{ wageRange }}</span>
    <span class="info-chip">非劳动收入 = {{ unearnedIncome }}</span>
    <span v-if="turningWage !== null" class="info-chip">
      理论转折工资 ≈ {{ turningWage }} 元/小时
    </span>
    <span v-if="turningPointVisible" class="info-chip emphasis-chip">
      当前工资区间可观察到后弯
    </span>
    <span v-if="viewMode === 'wide'" class="info-chip">宽屏模式</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  chartMeta: {
    type: Object,
    default: () => ({}),
  },
  viewMode: {
    type: String,
    default: 'normal',
  },
  params: {
    type: Object,
    default: () => ({}),
  },
});

const wageRange = computed(() => {
  return props.chartMeta.wageRange || '未知';
});

const utilityModelName = computed(() => {
  return props.chartMeta.utilityModelName || 'Cobb–Douglas';
});

const unearnedIncome = computed(() => {
  return props.params.unearnedIncome?.toFixed?.(0) ?? 0;
});

const turningWage = computed(() => {
  const value = props.chartMeta.turningWage;
  return Number.isFinite(value) ? value.toFixed(1) : null;
});

const turningPointVisible = computed(() => {
  return Boolean(props.chartMeta.turningPointVisible);
});
</script>

<style scoped>
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

.emphasis-chip {
  font-weight: 600;
}
</style>
