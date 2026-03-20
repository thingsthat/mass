<script setup lang="ts">
import { computed } from 'vue';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

interface Props {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();

const classes = computed(() => cn('flex flex-col gap-8 p-4', props.class));
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
