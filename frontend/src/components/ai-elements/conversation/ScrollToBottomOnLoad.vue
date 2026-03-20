<script setup lang="ts">
import { nextTick, watch } from 'vue';
import { useStickToBottomContext } from 'vue-stick-to-bottom';

const props = defineProps<{
  scrollTrigger: number;
  messageCount: number;
}>();

const { scrollToBottom } = useStickToBottomContext();

function scheduleScroll() {
  if (props.messageCount === 0) {
    return;
  }
  nextTick(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 50);
  });
}

watch(
  () => props.scrollTrigger,
  value => {
    if (value) {
      scheduleScroll();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div />
</template>
