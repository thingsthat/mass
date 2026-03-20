<script setup lang="ts">
import { SelectValue } from '@/components/ui/select';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputSelectValueProps = InstanceType<typeof SelectValue>['$props'];

interface Props extends /* @vue-ignore */ PromptInputSelectValueProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <SelectValue :class="cn(props.class)" v-bind="props">
    <slot />
  </SelectValue>
</template>
