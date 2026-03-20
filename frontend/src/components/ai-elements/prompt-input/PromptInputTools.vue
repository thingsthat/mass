<script setup lang="ts">
import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
  <div :class="cn('flex items-center gap-1', props.class)">
    <slot />
  </div>
</template>
