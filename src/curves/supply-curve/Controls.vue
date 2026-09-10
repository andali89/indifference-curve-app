<template>
  <div class="indifference-controls">
    <section class="control-section">
      <h3>效用函数</h3>
      <div class="control-item">
        <label for="utility-type">效用函数类型</label>
        <select id="utility-type" v-model="local.utilityType">
          <option value="cobb-douglas">Cobb–Douglas</option>
          <option value="satiating-income">收入边际效用递减型</option>
        </select>
      </div>

      <template v-if="local.utilityType === 'cobb-douglas'">
        <div class="control-grid">
          <div class="control-item">
            <label for="i-weight">收入权重 (α)</label>
            <input id="i-weight" type="number" min="0.1" step="0.1" v-model.number="local.iWeight" />
          </div>
          <div class="control-item">
            <label for="h-weight">闲暇权重 (β)</label>
            <input id="h-weight" type="number" min="0.1" step="0.1" v-model.number="local.hWeight" />
          </div>
        </div>
        <div class="formula">
          U = I<sup>{{ local.iWeight }}</sup> × H<sup>{{ local.hWeight }}</sup>
        </div>
      </template>

      <template v-else>
        <div class="control-grid">
          <div class="control-item">
            <label for="satiation-k">收入边际效用递减速度 (K)</label>
            <input id="satiation-k" type="number" min="1" step="10" v-model.number="local.satiationK" />
          </div>
          <div class="control-item">
            <label for="leisure-gamma">闲暇价值 (γ)</label>
            <input id="leisure-gamma" type="number" min="0.0001" step="0.001" v-model.number="local.leisureGamma" />
          </div>
        </div>
        <div class="formula">
          U = 1 − e<sup>−I/{{ local.satiationK }}</sup> + {{ local.leisureGamma }}H
        </div>
        <p class="formula-note">
          I 为收入，H 为闲暇时间。该模型可在高工资区间体现收入效应占主导时的向后弯曲劳动供给。
        </p>
      </template>
    </section>

    <section class="control-section">
      <h3>预算约束参数</h3>
      <div class="control-item">
        <label for="unearned-income">非劳动收入</label>
        <div class="input-with-unit">
          <input id="unearned-income" type="number" min="0" step="50" v-model.number="local.unearnedIncome" />
          <span class="unit">元</span>
        </div>
      </div>
    </section>

    <section class="control-section">
      <h3>工资率范围（供给曲线）</h3>
      <div class="control-grid">
        <div class="control-item">
          <label for="w-min">最低工资率</label>
          <div class="input-with-unit">
            <input id="w-min" type="number" min="1" step="5" v-model.number="local.wMin" />
            <span class="unit">元/小时</span>
          </div>
        </div>
        <div class="control-item">
          <label for="w-max">最高工资率</label>
          <div class="input-with-unit">
            <input id="w-max" type="number" min="10" step="10" v-model.number="local.wMax" />
            <span class="unit">元/小时</span>
          </div>
        </div>
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
      utilityType: 'cobb-douglas',
      iWeight: 1,
      hWeight: 1,
      satiationK: 660,
      leisureGamma: 0.029,
      unearnedIncome: 100,
      wMin: 10,
      wMax: 100,
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

    if (!['cobb-douglas', 'satiating-income'].includes(clone.utilityType)) {
      clone.utilityType = 'cobb-douglas';
      local.utilityType = 'cobb-douglas';
    }
    if (!(clone.iWeight > 0)) {
      clone.iWeight = 0.1;
      local.iWeight = 0.1;
    }
    if (!(clone.hWeight > 0)) {
      clone.hWeight = 0.1;
      local.hWeight = 0.1;
    }
    if (!(clone.satiationK > 0)) {
      clone.satiationK = 660;
      local.satiationK = 660;
    }
    if (!(clone.leisureGamma > 0)) {
      clone.leisureGamma = 0.029;
      local.leisureGamma = 0.029;
    }
    if (!(clone.unearnedIncome >= 0)) {
      clone.unearnedIncome = 0;
      local.unearnedIncome = 0;
    }
    if (!(clone.wMin > 0)) {
      clone.wMin = 1;
      local.wMin = 1;
    }
    if (!(clone.wMax > clone.wMin)) {
      clone.wMax = clone.wMin + 10;
      local.wMax = clone.wMin + 10;
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

input[type='number'],
select {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  font-size: 14px;
  background: #fff;
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

.formula-note {
  margin: -4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #666;
}

@media (max-width: 900px) {
  .control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
