<script setup lang="ts">
import { cn } from 'frontend/src/helpers/tailwind';

import LoaderIcon from './LoaderIcon.vue';

import type { HTMLAttributes } from 'vue';

interface Props {
  size?: number;
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  size: 16,
});
</script>

<template>
  <div
    :class="cn('inline-flex animate-spin items-center justify-center', props.class)"
    aria-label="Loading"
    aria-live="polite"
    role="status"
    v-bind="$attrs"
  >
    <LoaderIcon :size="props.size" />
  </div>
</template>
