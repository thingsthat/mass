<script setup lang="ts">
import { ButtonGroupText } from '@/components/ui/button-group';

import { cn } from 'frontend/src/helpers/tailwind';

import { useMessageBranchContext } from './context';

import type { HTMLAttributes } from 'vue';

interface Props {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();

const { currentBranch, totalBranches } = useMessageBranchContext();
</script>

<template>
  <ButtonGroupText
    :class="cn('border-none bg-transparent text-muted-foreground shadow-none', props.class)"
    v-bind="$attrs"
  >
    {{ currentBranch + 1 }} of {{ totalBranches }}
  </ButtonGroupText>
</template>
