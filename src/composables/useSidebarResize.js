import { onBeforeUnmount, ref } from 'vue';

export function useSidebarResize(options = {}) {
  const {
    initialWidth = 280,
    minWidth = 200,
    maxWidth = 600,
  } = options;

  const sidebarWidth = ref(initialWidth);
  const isResizing = ref(false);

  function handleMove(event) {
    if (!isResizing.value) return;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const next = Math.min(Math.max(clientX, minWidth), maxWidth);
    sidebarWidth.value = Math.round(next);
  }

  function stop() {
    if (!isResizing.value) return;
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', stop);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', stop);
    document.body.style.userSelect = '';
  }

  function start(event) {
    event.preventDefault();
    isResizing.value = true;
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', stop);
  }

  onBeforeUnmount(() => {
    stop();
  });

  return {
    sidebarWidth,
    isResizing,
    startResize: start,
  };
}
