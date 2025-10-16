<template>
  <div class="curve-selector">
    <label class="selector-label" for="curve-select">曲线类型</label>
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
  margin-bottom: 16px;
}

.selector-label {
  font-size: 13px;
  color: #555;
  font-weight: 600;
}

.selector-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  background: #fff;
  font-size: 14px;
  color: #1d1d1f;
  transition: border-color 0.2s ease;
}

.selector-input:focus {
  outline: none;
  border-color: #0ea5a4;
  box-shadow: 0 0 0 4px rgba(14, 165, 164, 0.12);
}
</style>
