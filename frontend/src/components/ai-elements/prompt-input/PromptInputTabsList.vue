<script setup lang="ts">
import { cn } from 'frontend/src/helpers/tailwind';

import type { HTMLAttributes } from 'vue';

interface Props extends /* @vue-ignore */ HTMLAttributes {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <div :class="cn(props.class)" v-bind="props">
    <slot />
  </div>
</template>
