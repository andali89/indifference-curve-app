<template>
  <div class="welfare-controls">
    <section class="control-section">
      <h3>福利制度类型</h3>
      <div class="policy-buttons">
        <button
          v-for="item in policyTypes"
          :key="item.value"
          type="button"
          class="policy-button"
          :class="{ 'policy-button--active': policyType === item.value }"
          :data-policy-type="item.value"
          @click="emitPatch({ policyType: item.value })"
        >
          {{ item.label }}
        </button>
      </div>
      <p class="policy-description">{{ activePolicyDescription }}</p>
    </section>

    <section class="control-section">
      <h3>福利计划参数</h3>

      <div class="control-item">
        <label for="wage-rate">工资率</label>
        <div class="input-with-unit">
          <input
            id="wage-rate"
            type="number"
            min="1"
            step="5"
            :value="modelValue.wageRate"
            @input="updatePositive('wageRate', $event.target.value, 50)"
          />
          <span class="unit">元/小时</span>
        </div>
      </div>

      <div class="control-item">
        <label for="max-benefit">最高补贴 G</label>
        <div class="input-with-unit">
          <input
            id="max-benefit"
            type="number"
            min="0"
            step="20"
            :value="modelValue.maxBenefit"
            @input="updateNonNegative('maxBenefit', $event.target.value, 200)"
          />
          <span class="unit">元</span>
        </div>
      </div>

      <div v-if="policyType === 'phaseout'" class="control-item">
        <label for="reduction-rate">福利削减率 r（0–1）</label>
        <input
          id="reduction-rate"
          type="number"
          min="0"
          max="1"
          step="0.1"
          :value="modelValue.reductionRate"
          @input="updateRate($event.target.value)"
        />
      </div>

      <div class="formula-card">
        <template v-if="policyType === 'nail'">
          <div><strong>不工作：</strong>B = G</div>
          <div><strong>一旦参加工作：</strong>B = 0</div>
        </template>
        <template v-else>
          <div><strong>补贴：</strong>B = max(0, G − r × 劳动收入)</div>
          <div><strong>总收入：</strong>非劳动收入 + 劳动收入 + 补贴</div>
        </template>
      </div>

      <p class="phaseout-note">{{ policyNote }}</p>
    </section>

    <section class="control-section">
      <h3>演示步骤</h3>
      <div class="stage-buttons">
        <button
          v-for="item in stages"
          :key="item.value"
          type="button"
          class="stage-button"
          :class="{ 'stage-button--active': currentStage === item.value }"
          @click="emitPatch({ stage: item.value })"
        >
          {{ item.label }}
        </button>
      </div>
      <p class="stage-description">{{ activeStageDescription }}</p>
    </section>

    <section class="assumption-card">
      <div><strong>可支配时间：</strong>16 小时</div>
      <div><strong>非劳动收入：</strong>100 元</div>
      <div><strong>偏好：</strong>Cobb–Douglas，收入与闲暇权重均为 1</div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      policyType: 'nail',
      wageRate: 50,
      maxBenefit: 200,
      reductionRate: 0.5,
      stage: 1,
    }),
  },
});

const emit = defineEmits(['update:modelValue']);

const policyTypes = [
  {
    value: 'nail',
    label: '钉子形',
    description: '不工作可领取全部补贴 G；只要参加工作，补贴立即全部取消，形成离散的补贴断崖。',
  },
  {
    value: 'phaseout',
    label: '逐步退出',
    description: '补贴随劳动收入按 r 逐步减少，预算约束连续，但在补贴退出点改变斜率。',
  },
];

const currentStage = computed(() => {
  const stage = Number(props.modelValue?.stage);
  return [1, 2, 3].includes(stage) ? stage : 1;
});

const policyType = computed(() => {
  return props.modelValue?.policyType === 'phaseout' ? 'phaseout' : 'nail';
});

const activePolicyDescription = computed(() => {
  return policyTypes.find((item) => item.value === policyType.value)?.description || policyTypes[0].description;
});

const stages = computed(() => policyType.value === 'nail'
  ? [
      { value: 1, label: '1 无补贴', description: '先观察普通预算线、无差异曲线和初始最优点 A。' },
      { value: 2, label: '2 加入补贴', description: '加入钉子形补偿点 C 与补贴断崖。竖直虚线只表示收入落差，不是可行预算线。' },
      { value: 3, label: '3 劳动供给变化', description: '比较最佳工作点 A 与不工作补偿点 C 的效用，判断福利制度是否使劳动者退出劳动市场。' },
    ]
  : [
      { value: 1, label: '1 无补贴', description: '先观察普通预算线、无差异曲线和初始最优点 A。' },
      { value: 2, label: '2 加入补贴', description: '加入收入审查型福利计划，重点观察预算约束的折点 K 与补贴退出区间。' },
      { value: 3, label: '3 劳动供给变化', description: '加入政策后的最优点 B，比较 A 与 B 的劳动时间并讨论收入效应和工作激励。' },
    ]);

const activeStageDescription = computed(() => {
  return stages.value.find((item) => item.value === currentStage.value)?.description || stages.value[0].description;
});

const policyNote = computed(() => {
  const wage = Number(props.modelValue?.wageRate);
  const benefit = Number(props.modelValue?.maxBenefit);
  const rate = Number(props.modelValue?.reductionRate);

  if (policyType.value === 'nail') {
    if (!(benefit > 0)) return '当前最高补贴为 0，钉子形福利制度与无补贴情形重合。';
    return `不工作时领取 ${benefit.toFixed(0)} 元补贴；一旦开始工作即失去全部补贴，因此参加工作首先要弥补 ${benefit.toFixed(0)} 元的补贴损失。`;
  }

  if (!(benefit > 0)) return '当前最高补贴为 0，福利计划预算约束与基准预算线重合。';
  if (!(rate > 0)) return '当前福利削减率为 0，补贴不会随劳动收入退出，因此预算线整体平行上移。';
  if (!(wage > 0)) return '请输入正的工资率。';

  const earnedIncome = benefit / rate;
  const work = earnedIncome / wage;
  if (work > 16) {
    return `补贴在劳动收入达到 ${earnedIncome.toFixed(0)} 元时退出；按当前工资，在 16 小时工作范围内仍未完全退出。`;
  }
  if (Math.abs(work - 16) < 1e-9) {
    return `补贴在劳动收入达到 ${earnedIncome.toFixed(0)} 元时退出，恰好对应工作 16.00 小时、闲暇 0.00 小时。`;
  }

  const leisure = 16 - work;
  return `补贴在劳动收入达到 ${earnedIncome.toFixed(0)} 元时退出，对应工作 ${work.toFixed(2)} 小时、闲暇 ${leisure.toFixed(2)} 小时。`;
});

function emitPatch(patch) {
  emit('update:modelValue', {
    ...props.modelValue,
    ...patch,
  });
}

function updatePositive(key, value, fallback) {
  const number = Number(value);
  emitPatch({ [key]: Number.isFinite(number) && number > 0 ? number : fallback });
}

function updateNonNegative(key, value, fallback) {
  const number = Number(value);
  emitPatch({ [key]: Number.isFinite(number) && number >= 0 ? number : fallback });
}

function updateRate(value) {
  const number = Number(value);
  const rate = Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : 0.5;
  emitPatch({ reductionRate: rate });
}
</script>

<style scoped>
.welfare-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
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

.policy-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.policy-button,
.stage-button {
  padding: 10px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.policy-button {
  text-align: center;
}

.policy-button--active,
.stage-button--active {
  border-color: #0f766e;
  background: #f0fdfa;
  color: #0f766e;
  font-weight: 600;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

input[type='number'] {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  font-size: 14px;
  background: #fff;
}

.input-with-unit input {
  flex: 1;
}

.unit {
  min-width: 50px;
  font-size: 13px;
  color: #666;
}

.formula-card,
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

.policy-description,
.phaseout-note,
.stage-description {
  margin: 0;
  color: #666;
  font-size: 13px;
  line-height: 1.6;
}

.stage-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stage-button {
  text-align: left;
}
</style>
