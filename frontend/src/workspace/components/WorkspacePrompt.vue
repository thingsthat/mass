<script setup lang="ts">
import PromptInput from 'frontend/src/components/ai-elements/prompt-input/PromptInput.vue';
import PromptInputBody from 'frontend/src/components/ai-elements/prompt-input/PromptInputBody.vue';
import PromptInputFooter from 'frontend/src/components/ai-elements/prompt-input/PromptInputFooter.vue';
import PromptInputProvider from 'frontend/src/components/ai-elements/prompt-input/PromptInputProvider.vue';
import PromptInputSelect from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelect.vue';
import PromptInputSelectContent from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectContent.vue';
import PromptInputSelectItem from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectItem.vue';
import PromptInputSelectTrigger from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectTrigger.vue';
import PromptInputSelectValue from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectValue.vue';
import PromptInputSubmit from 'frontend/src/components/ai-elements/prompt-input/PromptInputSubmit.vue';
import PromptInputTextarea from 'frontend/src/components/ai-elements/prompt-input/PromptInputTextarea.vue';
import PromptInputTools from 'frontend/src/components/ai-elements/prompt-input/PromptInputTools.vue';

import type { PromptInputMessage } from 'frontend/src/components/ai-elements/prompt-input/types';

export type PromptMode = 'chat' | 'feedback' | 'debate' | 'questionnaire';

export type ModeOption = { value: PromptMode; label: string };

export type SendToOption = { value: string; label: string; type: 'persona' | 'cohort' };

const props = withDefaults(
  defineProps<{
    canSend: boolean;
    status: 'ready' | 'submitted' | 'streaming' | 'error';
    sendToOptions: SendToOption[];
    sendTo: 'all' | string;
    mode: PromptMode;
    modeOptions: ModeOption[];
  }>(),
  { sendTo: 'all', mode: 'chat' }
);

const emit = defineEmits<{
  submit: [payload: PromptInputMessage];
  error: [payload: { code: string; message: string }];
  'update:sendTo': [value: 'all' | string];
  'update:mode': [value: PromptMode];
}>();

const handleSubmit = (payload: PromptInputMessage) => {
  emit('submit', payload);
};

const handleError = (payload: { code: string; message: string }) => {
  emit('error', payload);
};

function normalizeSendToValue(v: unknown): 'all' | string {
  if (typeof v === 'string' && v.length > 0) {
    return v;
  }
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
    return v[0];
  }
  return 'all';
}

function normalizeModeValue(v: unknown): PromptMode {
  const valid: PromptMode[] = ['chat', 'feedback', 'debate', 'questionnaire'];
  if (typeof v === 'string' && valid.includes(v as PromptMode)) {
    return v as PromptMode;
  }
  if (
    Array.isArray(v) &&
    v.length > 0 &&
    typeof v[0] === 'string' &&
    valid.includes(v[0] as PromptMode)
  ) {
    return v[0] as PromptMode;
  }
  return 'chat';
}
</script>

<template>
  <div class="workspace-prompt fixed inset-x-0 bottom-0 z-10 flex flex-col gap-4 p-4 pb-8 px-8">
    <PromptInputProvider
      class="mx-auto w-full max-w-2xl **:data-[slot=input-group]:bg-input"
      @submit="handleSubmit"
      @error="handleError"
    >
      <PromptInput multiple global-drop class="mx-auto w-full max-w-2xl">
        <PromptInputBody>
          <PromptInputTextarea
            class="min-h-12 text-foreground placeholder:text-muted-foreground"
            placeholder="What would you like to know?"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <div class="flex items-center gap-1">
            <PromptInputSelect
              :model-value="props.mode"
              @update:model-value="v => emit('update:mode', normalizeModeValue(v))"
            >
              <PromptInputSelectTrigger class="min-w-32 text-foreground">
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                <PromptInputSelectItem
                  v-for="option in props.modeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </PromptInputSelectItem>
              </PromptInputSelectContent>
            </PromptInputSelect>
            <PromptInputSelect
              v-if="props.sendToOptions.length > 0"
              :model-value="props.sendTo"
              @update:model-value="v => emit('update:sendTo', normalizeSendToValue(v))"
            >
              <PromptInputSelectTrigger class="min-w-32 text-foreground">
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                <PromptInputSelectItem value="all">All</PromptInputSelectItem>
                <PromptInputSelectItem
                  v-for="option in props.sendToOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </PromptInputSelectItem>
              </PromptInputSelectContent>
            </PromptInputSelect>
          </div>
          <PromptInputTools />
          <PromptInputSubmit :disabled="!props.canSend" :status="props.status" />
        </PromptInputFooter>
      </PromptInput>
    </PromptInputProvider>
  </div>
</template>

<style scoped>
.workspace-prompt::before {
  content: '';
  position: absolute;
  width: calc(100% - 1rem);
  inset: 0;
  backdrop-filter: blur(20px);
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 10%,
    rgba(0, 0, 0, 1) 70%
  );
  pointer-events: none;
}
</style>
