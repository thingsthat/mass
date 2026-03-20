<script setup lang="ts">
import { Loader2Icon } from 'lucide-vue-next';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <Loader2Icon role="status" aria-label="Loading" :class="cn('size-4 animate-spin', props.class)" />
</template>
