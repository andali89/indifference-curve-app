<template>
  <div class="controls">
    <!-- compact wage inputs -->
    <label>W min<input class="compact-input" v-model.number="localParams.wMin" /></label>
    <label>W max<input class="compact-input" v-model.number="localParams.wMax" /></label>
  </div>
</template>

<script setup>
import { reactive, toRefs } from 'vue';
defineProps({ params: Object });
const props = defineProps({ params: Object });
const localParams = reactive({ ...props.params });
</script>

<style scoped>
.compact-input { width: 6rem; margin-left: .5rem; }
</style>
