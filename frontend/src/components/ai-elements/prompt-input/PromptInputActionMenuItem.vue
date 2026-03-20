<script setup lang="ts">
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

type PromptInputActionMenuItemProps = InstanceType<typeof DropdownMenuItem>['$props'];

interface Props extends /* @vue-ignore */ PromptInputActionMenuItemProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <DropdownMenuItem :class="cn(props.class)">
    <slot />
  </DropdownMenuItem>
</template>
