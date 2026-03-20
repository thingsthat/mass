<script setup lang="ts">
import { formatRelativeTime } from 'core/src/helpers/time';
import { GithubIcon, MoonIcon, SunIcon } from 'lucide-vue-next';
import { computed } from 'vue';

import PromptInputSelect from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelect.vue';
import PromptInputSelectContent from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectContent.vue';
import PromptInputSelectItem from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectItem.vue';
import PromptInputSelectTrigger from 'frontend/src/components/ai-elements/prompt-input/PromptInputSelectTrigger.vue';
import Button from 'frontend/src/components/ui/button/Button.vue';
import DropdownMenu from 'frontend/src/components/ui/dropdown-menu/DropdownMenu.vue';
import DropdownMenuContent from 'frontend/src/components/ui/dropdown-menu/DropdownMenuContent.vue';
import DropdownMenuItem from 'frontend/src/components/ui/dropdown-menu/DropdownMenuItem.vue';
import DropdownMenuTrigger from 'frontend/src/components/ui/dropdown-menu/DropdownMenuTrigger.vue';
import WorkspaceLogo from 'frontend/src/workspace/components/WorkspaceLogo.vue';
import { useThemeToggle } from 'frontend/src/workspace/useThemeToggle';

import type { Workspace } from 'core/src/workspace/workspace.types';
import type { AcceptableValue } from 'reka-ui';

const { isDark, toggleTheme } = useThemeToggle();

const props = defineProps<{
  workspaces: Workspace[];
  currentWorkspaceId: string;
  currentWorkspaceName: string;
  isCreatingWorkspace: boolean;
  isSimulationWorkspace?: boolean;
  showSimulationGraph?: boolean;
}>();

const emit = defineEmits<{
  addWorkspace: [];
  selectWorkspace: [id: string];
  openMembershipDialog: [];
  openDeleteConfirmDialog: [];
  'update:showSimulationGraph': [value: boolean];
}>();

const workspacesSortedByLastModified = computed(() => {
  return [...props.workspaces].sort((a, b) => {
    const dateA = new Date(a.updated_at || 0).getTime();
    const dateB = new Date(b.updated_at || 0).getTime();
    return dateB - dateA;
  });
});

function handleWorkspaceSelect(value: AcceptableValue) {
  const id = typeof value === 'string' ? value : null;
  if (id && id !== props.currentWorkspaceId) {
    emit('selectWorkspace', id);
  }
}

function handleAddWorkspace() {
  emit('addWorkspace');
}

function handleOpenMembershipDialog() {
  emit('openMembershipDialog');
}

function handleOpenDeleteConfirmDialog() {
  emit('openDeleteConfirmDialog');
}
</script>

<template>
  <div class="workspace-header fixed inset-x-0 top-0 z-10">
    <div class="mx-auto flex items-center gap-2 px-4 py-4">
      <WorkspaceLogo />
      <Button
        type="button"
        variant="outline"
        size="default"
        class="bg-background dark:bg-background dark:hover:bg-accent dark:border-input"
        :disabled="isCreatingWorkspace"
        @click="handleAddWorkspace"
      >
        +
      </Button>
      <PromptInputSelect
        :model-value="currentWorkspaceId"
        @update:model-value="handleWorkspaceSelect"
      >
        <PromptInputSelectTrigger class="min-w-40 text-foreground">
          {{ currentWorkspaceName || 'Workspace' }}
        </PromptInputSelectTrigger>
        <PromptInputSelectContent>
          <PromptInputSelectItem
            v-for="workspaceItem in workspacesSortedByLastModified"
            :key="workspaceItem.id"
            :value="workspaceItem.id"
          >
            <span class="flex w-full items-center justify-between gap-3">
              <span>{{ workspaceItem.name || 'Untitled' }}</span>
              <span
                v-if="formatRelativeTime(workspaceItem.updated_at)"
                class="text-muted-foreground text-xs shrink-0"
              >
                {{ formatRelativeTime(workspaceItem.updated_at) }}
              </span>
            </span>
          </PromptInputSelectItem>
        </PromptInputSelectContent>
      </PromptInputSelect>
      <Button
        type="button"
        variant="outline"
        size="default"
        class="bg-background dark:bg-background dark:hover:bg-accent dark:border-input"
        @click="handleOpenMembershipDialog"
      >
        Personas & cohorts
      </Button>
      <div
        v-if="isSimulationWorkspace"
        class="flex shrink-0 items-center gap-0 rounded-md border border-input bg-background p-0.5 dark:bg-background"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 rounded px-3 text-sm font-medium transition-colors"
          :class="!showSimulationGraph ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
          @click="emit('update:showSimulationGraph', false)"
        >
          Chat
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 rounded px-3 text-sm font-medium transition-colors"
          :class="showSimulationGraph ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
          @click="emit('update:showSimulationGraph', true)"
        >
          Graph
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="default"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        class="ml-auto bg-background dark:bg-background dark:hover:bg-accent dark:border-input"
        @click="toggleTheme"
      >
        <SunIcon v-if="isDark" class="size-4" />
        <MoonIcon v-else class="size-4" />
      </Button>
      <Button
        as="a"
        variant="outline"
        size="default"
        class="bg-background dark:bg-background dark:hover:bg-accent dark:border-input"
        href="https://github.com/thingsthat/mass"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on GitHub"
      >
        <GithubIcon class="size-4" />
        GitHub
      </Button>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              type="button"
              variant="outline"
              size="default"
              class="bg-background dark:bg-background dark:hover:bg-accent dark:border-input"
            >
              ...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @select="handleOpenDeleteConfirmDialog">
              Delete workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workspace-header::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(20px);
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
  pointer-events: none;
  z-index: -1;
}
</style>
