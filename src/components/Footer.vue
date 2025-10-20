<template>
  <footer class="app-footer">
    <div class="footer-inner">© <span>{{ year }}</span> An-Da Li at TJCU. All rights reserved.</div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style scoped>
.app-footer {
  position: fixed;
  left: auto !important;
  right: 30px !important;
  width: auto;
  /* left: 0;
  right: 0; */
  
  bottom: 8px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 1200;
}

.footer-inner {
  background: rgba(255,255,255,0.92);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: #666;
  box-shadow: 0 6px 20px rgba(0,0,0,0.05);
  pointer-events: auto;
}
</style>
