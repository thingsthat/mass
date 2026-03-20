<script setup lang="ts">
import { CommandGroup } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandGroupProps = InstanceType<typeof CommandGroup>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandGroupProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <CommandGroup :class="cn(props.class)" v-bind="props">
    <slot />
  </CommandGroup>
</template>
