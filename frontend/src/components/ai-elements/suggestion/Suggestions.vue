<script setup lang="ts">
import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

interface SuggestionsProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<SuggestionsProps>();
</script>

<template>
  <div :class="cn('flex w-full flex-wrap items-center gap-2', props.class)" v-bind="$attrs">
    <slot />
  </div>
</template>
