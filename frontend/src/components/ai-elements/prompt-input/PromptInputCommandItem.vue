<script setup lang="ts">
import { CommandItem } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandItemProps = InstanceType<typeof CommandItem>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandItemProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <CommandItem v-bind="props" :class="cn(props.class)">
    <slot />
  </CommandItem>
</template>
