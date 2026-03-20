<script setup lang="ts">
import { InputGroupAddon } from '@/components/ui/input-group';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputHeaderProps = InstanceType<typeof InputGroupAddon>['$props'];

interface Props extends /* @vue-ignore */ Omit<PromptInputHeaderProps, 'align'> {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <InputGroupAddon
    align="block-end"
    :class="cn('order-first flex-wrap gap-1', props.class)"
    v-bind="props"
  >
    <slot />
  </InputGroupAddon>
</template>
