<script setup lang="ts">
import Message from 'frontend/src/components/ai-elements/message/Message.vue';
import MessageActions from 'frontend/src/components/ai-elements/message/MessageActions.vue';
import MessageBranchContent from 'frontend/src/components/ai-elements/message/MessageBranchContent.vue';
import MessageContent from 'frontend/src/components/ai-elements/message/MessageContent.vue';
import MessageResponse from 'frontend/src/components/ai-elements/message/MessageResponse.vue';
import Button from 'frontend/src/components/ui/button/Button.vue';
import DropdownMenu from 'frontend/src/components/ui/dropdown-menu/DropdownMenu.vue';
import DropdownMenuContent from 'frontend/src/components/ui/dropdown-menu/DropdownMenuContent.vue';
import DropdownMenuItem from 'frontend/src/components/ui/dropdown-menu/DropdownMenuItem.vue';
import DropdownMenuTrigger from 'frontend/src/components/ui/dropdown-menu/DropdownMenuTrigger.vue';

import type { Message as ConversationMessage } from 'core/src/workspace/conversation.types';

defineProps<{
  message: ConversationMessage;
}>();

const emit = defineEmits<{
  delete: [];
}>();
</script>

<template>
  <MessageBranchContent>
    <Message from="user">
      <div class="flex w-full flex-col gap-2">
        <MessageContent>
          <MessageResponse :content="message.content ?? ''" />
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
      </div>
    </Message>
  </MessageBranchContent>
</template>
