<script setup lang="ts">
import { type AvatarFallbackProps } from 'reka-ui';
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<
    AvatarFallbackProps & {
      hashKey?: string;
      variant?: 'default' | 'selectable';
      selected?: boolean;
      loading?: boolean;
    }
  >(),
  { variant: 'default', selected: false, loading: false }
);

const styleHash = computed(() => {
  if (!props.hashKey) {
    return '';
  }

  // Generate consistent colors from hash
  const hash = props.hashKey.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const h = Math.abs(hash % 360);
  const s = 65 + (hash % 20);
  const l = 45 + (hash % 10);

  const baseColor = `hsl(${h}, ${s}%, ${l}%)`;

  // Generate gradient positions from hash
  const pos1 = Math.abs((hash * 123) % 100);
  const pos2 = Math.abs((hash * 456) % 100);
  const pos3 = Math.abs((hash * 789) % 100);
  const pos4 = Math.abs((hash * 321) % 100);

  return `background-color: ${baseColor}; background-image:
    radial-gradient(at ${pos1}% ${pos2}%, hsl(${(h + 30) % 360}, ${s}%, ${l + 20}%) 0px, transparent 50%),
    radial-gradient(at ${pos2}% ${pos3}%, hsl(${(h + 60) % 360}, ${s}%, ${l + 10}%) 0px, transparent 50%),
    radial-gradient(at ${pos3}% ${pos4}%, hsl(${(h + 90) % 360}, ${s - 10}%, ${l - 10}%) 0px, transparent 50%),
    radial-gradient(at ${pos4}% ${pos1}%, hsl(${(h + 120) % 360}, ${s}%, ${l + 5}%) 0px, transparent 50%);`;
});

const shouldAnimate = ref(false);

watch(
  () => props.selected,
  (newValue, oldValue) => {
    if (newValue && oldValue === false) {
      shouldAnimate.value = true;
    }
  }
);

function onSpinAnimationEnd(event: AnimationEvent) {
  if (event.animationName?.includes('avatar-spin')) {
    shouldAnimate.value = false;
  }
}
</script>

<template>
  <div
    class="avatar-wrapper"
    :class="{
      'avatar-wrapper--selectable': props.variant === 'selectable',
      'avatar-wrapper--selected': props.variant === 'selectable' && props.selected,
      'avatar-wrapper--selected-animate':
        props.variant === 'selectable' && props.selected && shouldAnimate,
      'avatar-wrapper--loading': props.loading,
    }"
    @animationend="onSpinAnimationEnd"
  >
    <div ref="fallbackRef" :style="styleHash" class="avatar-fallback rounded-md"></div>
  </div>
</template>

<style scoped>
.avatar-wrapper {
  flex-shrink: 0;
}

.avatar-wrapper--selectable {
  cursor: pointer;
  border-radius: 0.375rem;
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline-color 0.15s ease;
}

.avatar-wrapper--selectable:hover {
  outline-color: var(--color-border, currentColor);
}

.avatar-wrapper--selected {
  outline-color: var(--color-primary, currentColor);
  outline-width: 2px;
  transform: rotate(90deg);
}

.avatar-wrapper--selected .avatar-fallback {
  transform: rotate(-90deg);
}

.avatar-wrapper--selected-animate {
  animation: avatar-spin 0.35s ease-in-out 1;
}

.avatar-wrapper--selected-animate .avatar-fallback {
  animation: avatar-radius 0.35s ease-in-out 1;
}

.avatar-wrapper--loading {
  overflow: visible;
  animation: avatar-spin-loading 2s linear infinite;
}

.avatar-wrapper--loading .avatar-fallback {
  animation: avatar-radius-loading 2s linear infinite;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  background-color: var(--color-tertiary);
  width: 24px;
  height: 24px;
  pointer-events: auto;
}

@keyframes avatar-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(90deg);
  }
}

@keyframes avatar-radius {
  0% {
    border-radius: 0.375rem;
    transform: rotate(0deg);
  }
  50% {
    border-radius: 50%;
    transform: rotate(-45deg);
  }
  100% {
    border-radius: 0.375rem;
    transform: rotate(-90deg);
  }
}

@keyframes avatar-spin-loading {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes avatar-radius-loading {
  0% {
    border-radius: 0.375rem;
  }
  50% {
    border-radius: 50%;
  }
  100% {
    border-radius: 0.375rem;
  }
}
</style>
