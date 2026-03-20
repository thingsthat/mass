<script setup lang="ts">
import { CommandEmpty } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandEmptyProps = InstanceType<typeof CommandEmpty>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandEmptyProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <CommandEmpty :class="cn(props.class)" v-bind="props">
    <slot />
  </CommandEmpty>
</template>
