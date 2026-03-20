<script setup lang="ts">
import { SelectTrigger } from '@/components/ui/select';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type SelectTriggerProps = InstanceType<typeof SelectTrigger>['$props'];

interface Props extends /* @vue-ignore */ SelectTriggerProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <SelectTrigger
    :class="
      cn(
        'rounded-md border border-border bg-background font-medium text-muted-foreground shadow-xs transition-colors',
        'hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground',
        'dark:bg-background dark:hover:bg-accent dark:aria-expanded:bg-accent',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        props.class
      )
    "
    v-bind="props"
  >
    <slot />
  </SelectTrigger>
</template>
