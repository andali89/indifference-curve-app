<template>
  <div class="curve-selector">
    <h3 class="selector-label" for="curve-select">曲线类型</h3>
    <select
      id="curve-select"
      class="selector-input"
      :value="modelValue"
      @change="onChange"
    >
      <option
        v-for="curve in curves"
        :key="curve.id"
        :value="curve.id"
      >
        {{ curve.name }}
      </option>
    </select>
  </div>
</template>

<script setup>
const props = defineProps({
  curves: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

function onChange(event) {
  emit('update:modelValue', event.target.value);
}
</script>

<style scoped>
.curve-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.selector-label {
  padding-left: 36px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  
}

.selector-input {
  box-sizing: border-box;
  width: 80%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  background: #fff;
  font-size: 14px;
  color: #1d1d1f;
  margin: 0 auto;
  align-self: center;
  transition: border-color 0.2s ease;
}

.selector-input:focus {
  outline: none;
  border-color: #0ea5a4;
  box-shadow: 0 0 0 4px rgba(14, 165, 164, 0.12);
}
</style>
