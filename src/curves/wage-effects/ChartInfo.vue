<template>
  <div class="wage-effects-info">
    <div class="info-chips">
      <span class="info-chip">{{ chartMeta.utilityModelName }}</span>
      <template v-if="stage === 1">
        <span class="info-chip">A 初始劳动 = {{ formatHours(initialPoint.work) }}</span>
      </template>

      <template v-else-if="stage === 2">
        <span class="info-chip">A 初始劳动 = {{ formatHours(initialPoint.work) }}</span>
        <span class="info-chip">C 新劳动 = {{ formatHours(newPoint.work) }}</span>
        <span class="info-chip emphasis-chip">总效应 = {{ formatSignedHours(effects.totalWork) }}</span>
      </template>

      <template v-else>
        <span class="info-chip">替代效应 = {{ formatSignedHours(effects.substitutionWork) }}</span>
        <span class="info-chip">收入效应 = {{ formatSignedHours(effects.incomeWork) }}</span>
        <span class="info-chip emphasis-chip">总效应 = {{ formatSignedHours(effects.totalWork) }}</span>
      </template>

      <span v-if="hasCornerSolution" class="info-chip warning-chip">当前参数包含边界最优点</span>
    </div>

    <p class="teaching-note">{{ teachingNote }}</p>
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

const stage = computed(() => Number(props.chartMeta.stage) || 1);
const initialPoint = computed(() => props.chartMeta.initialPoint || {});
const newPoint = computed(() => props.chartMeta.newPoint || {});
const effects = computed(() => props.chartMeta.effects || {});
const hasCornerSolution = computed(() => Boolean(props.chartMeta.hasCornerSolution));

const teachingNote = computed(() => {
  if (stage.value === 1) {
    return 'A 为初始工资率下的效用最大化选择。';
  }
  if (stage.value === 2) {
    return 'A→C 是工资变化后的总效应。';
  }
  return '补偿线平行于旧预算线，在 B 点达到新效用 U₁。A→B 为收入效应，B→C 为替代效应；数值按劳动时间计，方向与横轴闲暇相反。';
});

function formatHours(value) {
  return `${formatNumber(value)} 小时`;
}

function formatSignedHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(2)} 小时`;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : '-';
}
</script>

<style scoped>
.wage-effects-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
  font-weight: 700;
}

.warning-chip {
  background: #fff7ed;
  color: #9a3412;
}

.teaching-note {
  margin: 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}
</style>
