<script setup lang="ts">
import { CommandList } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandListProps = InstanceType<typeof CommandList>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandListProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <CommandList :class="cn(props.class)" v-bind="props" />
</template>
