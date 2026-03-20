<script setup lang="ts">
import { computed } from 'vue';

import PersonaAvatar from 'frontend/src/components/PersonaAvatar.vue';
import Message from 'frontend/src/components/ai-elements/message/Message.vue';
import MessageActions from 'frontend/src/components/ai-elements/message/MessageActions.vue';
import MessageBranchContent from 'frontend/src/components/ai-elements/message/MessageBranchContent.vue';
import MessageContent from 'frontend/src/components/ai-elements/message/MessageContent.vue';
import MessageResponse from 'frontend/src/components/ai-elements/message/MessageResponse.vue';
import Shimmer from 'frontend/src/components/ai-elements/shimmer/Shimmer.vue';
import Suggestion from 'frontend/src/components/ai-elements/suggestion/Suggestion.vue';
import Suggestions from 'frontend/src/components/ai-elements/suggestion/Suggestions.vue';
import Button from 'frontend/src/components/ui/button/Button.vue';
import DropdownMenu from 'frontend/src/components/ui/dropdown-menu/DropdownMenu.vue';
import DropdownMenuContent from 'frontend/src/components/ui/dropdown-menu/DropdownMenuContent.vue';
import DropdownMenuItem from 'frontend/src/components/ui/dropdown-menu/DropdownMenuItem.vue';
import DropdownMenuTrigger from 'frontend/src/components/ui/dropdown-menu/DropdownMenuTrigger.vue';
import WorkspaceMessageReport from 'frontend/src/workspace/components/WorkspaceMessageReport.vue';
import { parseInlineReportPayload } from 'frontend/src/workspace/inlineReportPayload';

import type {
  InlineReportMessagePayload,
  Message as ConversationMessage,
  SpeakerReply,
} from 'core/src/workspace/conversation.types';

const props = defineProps<{
  message: ConversationMessage;
  showFollowupSuggestions: boolean;
}>();

const emit = defineEmits<{
  delete: [];
  suggestionClick: [suggestion: string];
  updateReportPayload: [payload: InlineReportMessagePayload];
}>();

const reportPayload = computed(() => parseInlineReportPayload(props.message.content));

const speakerReplies = computed(() => getSpeakerReplies(props.message));

const displayContent = computed(() => {
  const replies = speakerReplies.value;
  if (replies) {
    return replies
      .map(r => `**${r.name ?? 'Persona'}:** ${(r.content ?? '').trim()}`)
      .filter(Boolean)
      .join('\n\n');
  }
  return props.message.content ?? '';
});

const showThinking = computed(
  () =>
    !reportPayload.value &&
    !speakerReplies.value &&
    (!props.message.content ||
      (typeof props.message.content === 'string' && !props.message.content.trim()))
);

function getSpeakerReplies(msg: ConversationMessage): SpeakerReply[] | null {
  const raw = msg.content ?? '';
  if (msg.role !== 'assistant') {
    return null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  if (!raw.trim().startsWith('{')) {
    return null;
  }
  if (parseInlineReportPayload(raw)) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      content?: SpeakerReply[] | string | string[];
      followup?: string[];
    };
    const content = parsed?.content;
    if (!Array.isArray(content) || content.length === 0) {
      return null;
    }
    if (typeof content[0] !== 'object' || content[0] === null || !('persona_id' in content[0])) {
      return null;
    }
    return content as SpeakerReply[];
  } catch (error) {
    console.error('[WorkspaceMessageAssistant] getSpeakerReplies: parse error', {
      error,
    });
    return null;
  }
}
</script>

<template>
  <MessageBranchContent>
    <Message from="assistant">
      <div class="flex w-full flex-col gap-2">
        <MessageContent>
          <template v-if="reportPayload">
            <WorkspaceMessageReport
              :payload="reportPayload"
              @update-payload="emit('updateReportPayload', $event)"
            />
          </template>
          <template v-else-if="speakerReplies?.length">
            <div
              v-for="(reply, replyIndex) in speakerReplies"
              :key="reply.persona_id + String(replyIndex)"
              class="speaker-reply"
            >
              <div class="speaker-reply-avatar">
                <PersonaAvatar
                  :hash-key="reply.persona_id"
                  :loading="!(reply.content ?? '').trim()"
                />
              </div>
              <div class="speaker-reply-text">
                <strong>{{ reply.name ?? 'Persona' }}:</strong>
                <Shimmer
                  v-if="!(reply.content ?? '').trim()"
                  :duration="1"
                  class="shimmer-placeholder"
                >
                  Thinking...
                </Shimmer>
                <MessageResponse v-else :content="(reply.content ?? '').trim()" />
              </div>
            </div>
          </template>
          <span v-else-if="showThinking" class="text-foreground"> Thinking... </span>
          <MessageResponse v-else :content="displayContent" />
        </MessageContent>
        <MessageActions>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button type="button" variant="ghost" size="default"> ... </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @select="emit('delete')"> Delete </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </MessageActions>
        <Suggestions
          v-if="showFollowupSuggestions && !message.isPending && message.followup?.length"
          class="mt-3"
        >
          <Suggestion
            v-for="suggestion in message.followup"
            :key="suggestion"
            variant="outline"
            :suggestion="suggestion"
            @click="emit('suggestionClick', suggestion)"
          />
        </Suggestions>
      </div>
    </Message>
  </MessageBranchContent>
</template>

<style scoped>
.speaker-reply {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.speaker-reply:last-child {
  margin-bottom: 0;
}

.speaker-reply-avatar {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
}

.speaker-reply-text {
  flex: 1 1 auto;
  min-width: 0;
}

.speaker-reply-text strong {
  font-weight: 600;
}

.shimmer-placeholder {
  display: block;
  min-height: 1rem;
}
</style>
