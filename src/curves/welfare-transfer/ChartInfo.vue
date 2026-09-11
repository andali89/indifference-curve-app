<template>
  <div class="welfare-info">
    <div class="info-chips">
      <span class="info-chip">{{ chartMeta.utilityModelName }}</span>

      <template v-if="stage === 1">
        <span class="info-chip">A 初始劳动 = {{ formatHours(baselinePoint.work) }}</span>
      </template>

      <template v-else-if="stage === 2">
        <span v-if="chartMeta.hasVisibleKink" class="info-chip">
          K：补贴退出时劳动 = {{ formatHours(chartMeta.phaseOutWork) }}
        </span>
        <span v-else class="info-chip">当前参数下没有图内折点</span>
        <span class="info-chip">最高补贴 = {{ formatMoney(chartMeta.maxBenefit) }}</span>
      </template>

      <template v-else>
        <span class="info-chip">A 初始劳动 = {{ formatHours(baselinePoint.work) }}</span>
        <span class="info-chip">B 政策后劳动 = {{ formatHours(policyPoint.work) }}</span>
        <span class="info-chip emphasis-chip">劳动变化 = {{ formatSignedHours(chartMeta.workChange) }}</span>
        <span class="info-chip">B 点补贴 = {{ formatMoney(chartMeta.benefitAtPolicyOptimum) }}</span>
      </template>

      <span v-if="chartMeta.hasCornerSolution" class="info-chip warning-chip">当前参数包含边界最优点</span>
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
const baselinePoint = computed(() => props.chartMeta.baselinePoint || {});
const policyPoint = computed(() => props.chartMeta.policyPoint || {});

const teachingNote = computed(() => {
  if (stage.value === 1) {
    return 'A 是没有福利计划时，在普通劳动—闲暇预算线上的效用最大化选择。';
  }
  if (stage.value === 2) {
    if (props.chartMeta.hasVisibleKink) {
      return 'K 是补贴恰好降为 0 的位置。K 右侧仍领取补贴，有效净工资为 (1−r)w，因此预算线更平坦。';
    }
    return '当前参数没有产生图内折点：可能是补贴为 0、福利不随收入退出，或在 16 小时工作范围内仍未完全退出。';
  }
  const change = Number(props.chartMeta.workChange);
  if (Number.isFinite(change) && change < 0) {
    return '政策后 B 点的劳动时间低于 A 点。补贴提高可支配资源，同时福利随收入削减也降低了补贴区间内的有效净工资，两种机制都可能抑制劳动供给。';
  }
  if (Number.isFinite(change) && change > 0) {
    return '在当前参数和偏好下，政策后劳动时间增加。应结合 B 点是否位于补贴区间、折点位置及预算线斜率解释这一结果。';
  }
  return '当前参数下政策前后的劳动时间相同。';
});

function formatHours(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} 小时` : '-';
}

function formatSignedHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(2)} 小时`;
}

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(0)} 元` : '-';
}
</script>

<style scoped>
.welfare-info {
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
