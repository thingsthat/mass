<script setup lang="ts">
import { CommandSeparator } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandSeparatorProps = InstanceType<typeof CommandSeparator>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandSeparatorProps {
  class?: HTMLAttributes['class'];
}
const props = defineProps<Props>();
</script>

<template>
  <CommandSeparator :class="cn(props.class)" v-bind="props" />
</template>
