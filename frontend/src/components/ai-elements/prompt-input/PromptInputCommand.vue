<script setup lang="ts">
import { Command } from '@/components/ui/command';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputCommandProps = InstanceType<typeof Command>['$props'];

interface Props extends /* @vue-ignore */ PromptInputCommandProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <Command :class="cn(props.class)" v-bind="props">
    <slot />
  </Command>
</template>
