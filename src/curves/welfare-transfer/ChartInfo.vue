<template>
  <div class="welfare-info">
    <div class="info-chips">
      <span class="info-chip">{{ chartMeta.utilityModelName }}</span>
      <span class="info-chip">{{ policyTypeLabel }}</span>

      <template v-if="stage === 1">
        <span class="info-chip">A 初始劳动 = {{ formatHours(baselinePoint.work) }}</span>
      </template>

      <template v-else-if="policyType === 'nail' && stage === 2">
        <span v-if="chartMeta.hasBenefitCliff" class="info-chip">
          C 不工作总收入 = {{ formatMoney(nonworkPoint.income) }}
        </span>
        <span v-if="chartMeta.hasBenefitCliff" class="info-chip">
          补贴断崖 = {{ formatMoney(chartMeta.benefitCliffAmount) }}
        </span>
        <span v-else class="info-chip">最高补贴为 0，与无补贴情形重合</span>
      </template>

      <template v-else-if="stage === 2">
        <span v-if="chartMeta.hasVisibleKink" class="info-chip">
          K：补贴退出时劳动 = {{ formatHours(chartMeta.phaseOutWork) }}
        </span>
        <span v-else class="info-chip">当前参数下没有图内折点</span>
        <span class="info-chip">最高补贴 = {{ formatMoney(chartMeta.maxBenefit) }}</span>
      </template>

      <template v-else-if="policyType === 'nail'">
        <span class="info-chip">A 工作效用 = {{ formatUtility(workingPoint.utility) }}</span>
        <span class="info-chip">C 不工作效用 = {{ formatUtility(nonworkPoint.utility) }}</span>
        <span class="info-chip emphasis-chip">最终选择 = {{ participationChoiceLabel }}</span>
        <span class="info-chip">劳动变化 = {{ formatSignedHours(chartMeta.workChange) }}</span>
      </template>

      <template v-else>
        <span class="info-chip">A 初始劳动 = {{ formatHours(baselinePoint.work) }}</span>
        <span class="info-chip">B 政策后劳动 = {{ formatHours(policyPoint.work) }}</span>
        <span class="info-chip emphasis-chip">劳动变化 = {{ formatSignedHours(chartMeta.workChange) }}</span>
        <span class="info-chip">B 点补贴 = {{ formatMoney(chartMeta.benefitAtPolicyOptimum) }}</span>
      </template>

      <span v-if="stage >= 3 && chartMeta.hasCornerSolution" class="info-chip warning-chip">当前参数包含边界最优点</span>
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
const policyType = computed(() => props.chartMeta.policyType === 'phaseout' ? 'phaseout' : 'nail');
const baselinePoint = computed(() => props.chartMeta.baselinePoint || {});
const policyPoint = computed(() => props.chartMeta.policyPoint || {});
const workingPoint = computed(() => props.chartMeta.workingPoint || baselinePoint.value);
const nonworkPoint = computed(() => props.chartMeta.nonworkPoint || {});
const policyTypeLabel = computed(() => policyType.value === 'nail' ? '钉子形福利' : '逐步退出福利');
const participationChoiceLabel = computed(() => props.chartMeta.participationChoice === 'nonwork' ? '不工作' : '工作');

const teachingNote = computed(() => {
  if (stage.value === 1) {
    return 'A 是没有福利计划时，在普通劳动—闲暇预算线上的效用最大化选择。';
  }

  if (policyType.value === 'nail') {
    if (stage.value === 2) {
      if (!props.chartMeta.hasBenefitCliff) {
        return '最高补贴为 0 时，钉子形制度不会改变预算约束。';
      }
      return 'C 表示完全不工作并领取全部补贴 G。只要劳动时间从 0 变为正值，补贴立即取消；竖直虚线只表示这段收入落差，不是可行预算线。';
    }

    if (props.chartMeta.participationChoice === 'nonwork') {
      return 'C 的效用高于最佳工作点 A，因此劳动者选择不参加工作。参加工作的最初收入必须先弥补全部补贴损失 G，这种离散的参与成本会显著抑制劳动供给。';
    }
    return '最佳工作点 A 的效用高于不工作补偿点 C，因此当前工资收入足以弥补失去补贴的参与成本，劳动者仍选择工作。';
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

function formatUtility(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(0) : '-';
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
