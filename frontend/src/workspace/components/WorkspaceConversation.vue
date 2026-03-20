<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';

import Conversation from 'frontend/src/components/ai-elements/conversation/Conversation.vue';
import ConversationContent from 'frontend/src/components/ai-elements/conversation/ConversationContent.vue';
import ConversationEmptyState from 'frontend/src/components/ai-elements/conversation/ConversationEmptyState.vue';
import ConversationScrollButton from 'frontend/src/components/ai-elements/conversation/ConversationScrollButton.vue';
import Message from 'frontend/src/components/ai-elements/message/Message.vue';
import MessageActions from 'frontend/src/components/ai-elements/message/MessageActions.vue';
import MessageBranch from 'frontend/src/components/ai-elements/message/MessageBranch.vue';
import MessageBranchContent from 'frontend/src/components/ai-elements/message/MessageBranchContent.vue';
import MessageContent from 'frontend/src/components/ai-elements/message/MessageContent.vue';
import MessageResponse from 'frontend/src/components/ai-elements/message/MessageResponse.vue';
import Button from 'frontend/src/components/ui/button/Button.vue';
import DropdownMenu from 'frontend/src/components/ui/dropdown-menu/DropdownMenu.vue';
import DropdownMenuContent from 'frontend/src/components/ui/dropdown-menu/DropdownMenuContent.vue';
import DropdownMenuItem from 'frontend/src/components/ui/dropdown-menu/DropdownMenuItem.vue';
import DropdownMenuTrigger from 'frontend/src/components/ui/dropdown-menu/DropdownMenuTrigger.vue';
import WorkspaceMessageAssistant from 'frontend/src/workspace/components/WorkspaceMessageAssistant.vue';
import WorkspaceMessageSystem from 'frontend/src/workspace/components/WorkspaceMessageSystem.vue';
import WorkspaceMessageUser from 'frontend/src/workspace/components/WorkspaceMessageUser.vue';

import type {
  InlineReportMessagePayload,
  Message as ConversationMessage,
} from 'core/src/workspace/conversation.types';

const props = withDefaults(
  defineProps<{
    messages: ConversationMessage[];
    scrollToBottomTrigger?: number;
  }>(),
  { scrollToBottomTrigger: 0 }
);

const emit = defineEmits<{
  deleteMessage: [messageId: string];
  scrollToBottomReady: [];
  suggestionClick: [suggestion: string];
  updateReportPayload: [messageId: string, payload: InlineReportMessagePayload];
}>();

function scheduleScrollToBottomReady() {
  if (props.messages.length === 0 || !props.scrollToBottomTrigger) {
    return;
  }
  setTimeout(() => {
    emit('scrollToBottomReady');
  }, 100);
}

onMounted(() => {
  scheduleScrollToBottomReady();
});

watch(
  () => props.scrollToBottomTrigger,
  () => scheduleScrollToBottomReady(),
  { immediate: false }
);

const lastAssistantMessageIndexWithFollowup = computed(() => {
  for (let i = props.messages.length - 1; i >= 0; i--) {
    const msg = props.messages[i];
    if (msg.role === 'assistant' && msg.followup?.length) {
      return i;
    }
  }
  return -1;
});
</script>

<template>
  <Conversation class="relative mx-auto flex min-h-80 max-w-160 flex-1 flex-col bg-card">
    <ConversationContent>
      <ConversationEmptyState v-if="messages.length === 0" />
      <template v-else>
        <MessageBranch v-for="(msg, index) in messages" :key="msg.id" :default-branch="0">
          <WorkspaceMessageUser
            v-if="msg.role === 'user'"
            :message="msg"
            @delete="emit('deleteMessage', msg.id)"
          />
          <WorkspaceMessageAssistant
            v-else-if="msg.role === 'assistant'"
            :message="msg"
            :show-followup-suggestions="index === lastAssistantMessageIndexWithFollowup"
            @delete="emit('deleteMessage', msg.id)"
            @suggestion-click="emit('suggestionClick', $event)"
            @update-report-payload="emit('updateReportPayload', msg.id, $event)"
          />
          <WorkspaceMessageSystem
            v-else-if="msg.role === 'system' && msg._metadata?.intervention"
            :message="msg"
          />
          <MessageBranchContent v-else>
            <Message :from="msg.role">
              <div class="flex w-full flex-col gap-2">
                <MessageContent>
                  <MessageResponse :content="msg.content ?? ''" />
                </MessageContent>
                <MessageActions>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button type="button" variant="ghost" size="default"> ... </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem @select="emit('deleteMessage', msg.id)">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </MessageActions>
              </div>
            </Message>
          </MessageBranchContent>
        </MessageBranch>
      </template>
    </ConversationContent>
    <ConversationScrollButton />
  </Conversation>
</template>
