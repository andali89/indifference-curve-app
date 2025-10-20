<template>
  <div class="chart-info">
    <div>工资范围: {{ chartMeta?.wageRange?.join(' - ') ?? 'N/A' }}</div>
    <div>效用: {{ chartMeta?.utility ?? 'N/A' }}</div>
  </div>
</template>

<script setup>
defineProps({ chartMeta: Object, viewMode: String, params: Object });
</script>

<style scoped>
.chart-info { font-size: 0.9rem; }
</style>
