<script setup lang="ts">
import { CommandInput } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandInputProps = InstanceType<typeof CommandInput>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandInputProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <CommandInput :class="cn(props.class)" v-bind="props" />
</template>
