import { onBeforeUnmount, ref } from 'vue';

export function useFullscreen(targetRef) {
  const isFullscreen = ref(false);

  async function enter() {
    const el = targetRef?.value;
    if (!el) return;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  }

  async function exit() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen?.();
    } else if (document.msFullscreenElement) {
      document.msExitFullscreen?.();
    }
  }

  function toggle() {
    if (isFullscreen.value) {
      exit();
    } else {
      enter();
    }
  }

  function handleChange() {
    const active = Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
    isFullscreen.value = active;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    document.addEventListener('msfullscreenchange', handleChange);
  }

  onBeforeUnmount(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('msfullscreenchange', handleChange);
    }
  });

  return {
    isFullscreen,
    enter,
    exit,
    toggle,
  };
}
