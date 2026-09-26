<template>
  <section v-if="controlsComponent" class="curve-panel">
    <component
      :is="controlsComponent"
      :modelValue="modelValue"
      @update:modelValue="onChildUpdate"
      @commit:utility="emit('commit:utility', $event)"
      @preview:utility="emit('preview:utility', $event)"
      @cancel:utility-preview="emit('cancel:utility-preview')"
    />
  </section>
  <p v-else class="curve-panel__placeholder">请选择一个曲线类型</p>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  curve: {
    type: Object,
    default: null,
  },
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue', 'commit:utility', 'preview:utility', 'cancel:utility-preview']);

const controlsComponent = computed(() => props.curve?.ControlsComponent ?? null);

function onChildUpdate(value) {
  // Forward the child's update directly to parent
  emit('update:modelValue', value || {});
}
</script>

<style scoped>
.curve-panel {
  display: flex;
  flex-direction: column;
  padding: 20px 25px 20px 36px;
  gap: 20px;
  background: #fff;
}

.curve-panel__placeholder {
  padding: 20px;
  color: #555;
}

@media (max-width: 900px) {
  .curve-panel {
    padding: 20px;
  }
}
</style>
