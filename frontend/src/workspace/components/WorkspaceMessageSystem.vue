<script setup lang="ts">
import { computed } from 'vue';

import Message from 'frontend/src/components/ai-elements/message/Message.vue';
import MessageBranchContent from 'frontend/src/components/ai-elements/message/MessageBranchContent.vue';

import type { Message as ConversationMessage } from 'core/src/workspace/conversation.types';

const props = defineProps<{
  message: ConversationMessage;
}>();

const intervention = computed(() => props.message._metadata?.intervention);

const stepLabel = computed(() => {
  const meta = intervention.value;
  if (!meta) {
    return '';
  }
  if (meta.status === 'applied' && meta.applied_step !== undefined) {
    return `Applied at step ${meta.applied_step}`;
  }
  if (meta.status === 'pending' && meta.trigger_step !== undefined) {
    return `Scheduled for step ${meta.trigger_step}`;
  }
  return meta?.status === 'pending' ? 'Scheduled for next step' : '';
});

const effectsSummary = computed(() => {
  const effects = intervention.value?.effects;
  if (!effects || typeof effects !== 'object') {
    return '';
  }
  const entries = Object.entries(effects).map(([key, value]) => `${key}: ${String(value)}`);
  return entries.length ? entries.join(', ') : '';
});
</script>

<template>
  <MessageBranchContent>
    <Message from="system">
      <div class="workspace-message-system">
        <div class="workspace-message-system__header">
          <span class="workspace-message-system__title">{{
            intervention?.title ?? message.content
          }}</span>
          <span class="workspace-message-system__status" :data-status="intervention?.status">
            {{ intervention?.status }}
          </span>
        </div>
        <p v-if="stepLabel" class="workspace-message-system__step">{{ stepLabel }}</p>
        <p v-if="intervention?.description" class="workspace-message-system__description">
          {{ intervention.description }}
        </p>
        <p v-if="effectsSummary" class="workspace-message-system__effects">
          Effects: {{ effectsSummary }}
        </p>
      </div>
    </Message>
  </MessageBranchContent>
</template>

<style scoped>
.workspace-message-system {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--colour-surface-muted, #f5f5f5);
  border: 1px solid var(--colour-border, #e5e5e5);
}

.workspace-message-system__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.workspace-message-system__title {
  font-weight: 600;
  font-size: 0.9375rem;
}

.workspace-message-system__status {
  font-size: 0.75rem;
  text-transform: uppercase;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.workspace-message-system__status[data-status='pending'] {
  background: var(--colour-warning-muted, #fef3c7);
  color: var(--colour-warning, #b45309);
}

.workspace-message-system__status[data-status='applied'] {
  background: var(--colour-success-muted, #d1fae5);
  color: var(--colour-success, #047857);
}

.workspace-message-system__step {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--colour-text-secondary, #6b7280);
}

.workspace-message-system__description {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.workspace-message-system__effects {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--colour-text-secondary, #6b7280);
  font-family: var(--font-mono, monospace);
}
</style>
