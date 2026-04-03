<script setup lang="ts">
import { nanoid } from 'nanoid';
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import Loader from 'frontend/src/components/ai-elements/loader/Loader.vue';
import Alert from 'frontend/src/components/ui/alert/Alert.vue';
import AlertDescription from 'frontend/src/components/ui/alert/AlertDescription.vue';
import Button from 'frontend/src/components/ui/button/Button.vue';
import Dialog from 'frontend/src/components/ui/dialog/Dialog.vue';
import DialogContent from 'frontend/src/components/ui/dialog/DialogContent.vue';
import DialogDescription from 'frontend/src/components/ui/dialog/DialogDescription.vue';
import DialogFooter from 'frontend/src/components/ui/dialog/DialogFooter.vue';
import DialogTitle from 'frontend/src/components/ui/dialog/DialogTitle.vue';
import { useCohorts } from 'frontend/src/personas/hooks/useCohorts';
import { usePersonas } from 'frontend/src/personas/hooks/usePersonas';
import { startReportGeneration } from 'frontend/src/reports/reportsApi';
import WorkspaceConversation from 'frontend/src/workspace/components/WorkspaceConversation.vue';
import WorkspaceHeader from 'frontend/src/workspace/components/WorkspaceHeader.vue';
import WorkspaceMembershipDialog from 'frontend/src/workspace/components/WorkspaceMembershipDialog.vue';
import WorkspacePrompt from 'frontend/src/workspace/components/WorkspacePrompt.vue';
import WorkspaceSimulationGraph from 'frontend/src/workspace/components/WorkspaceSimulationGraph.vue';
import {
  parseInlineReportPayload,
  serialiseInlineReportPayload,
} from 'frontend/src/workspace/inlineReportPayload';
import { fetchPromptAsk } from 'frontend/src/workspace/workflowApi';
import {
  deleteWorkspace as deleteWorkspaceApi,
  fetchWorkspace,
  fetchWorkspaces,
  upsertWorkspaceConversation,
} from 'frontend/src/workspace/workspaceApi';

import type { SimulationWorkflow } from 'core/src/simulation/simulation.types';
import type {
  InlineReportMessagePayload,
  InlineReportType,
  Message as ConversationMessage,
} from 'core/src/workspace/conversation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';
import type { PromptInputMessage } from 'frontend/src/components/ai-elements/prompt-input/types';
import type { ModeOption, PromptMode } from 'frontend/src/workspace/components/WorkspacePrompt.vue';

const route = useRoute();
const router = useRouter();
const workspace = ref<Workspace | null>(null);
const workspaces = ref<Workspace[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const messages = ref<ConversationMessage[]>([]);
const status = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready');

const currentWorkspaceId = computed(() => (route.params.id as string) ?? '');
const currentWorkspaceName = computed(() => {
  const found = workspaces.value.find(
    workspaceItem => workspaceItem.id === currentWorkspaceId.value
  );
  return found?.name || 'Untitled';
});
const hasPersonasOrCohorts = computed(() => {
  const conversation = workspace.value?.conversation;
  const personaCount = conversation?.persona_ids?.length ?? 0;
  const cohortCount = conversation?.cohort_ids?.length ?? 0;
  return personaCount > 0 || cohortCount > 0;
});
const isCreatingWorkspace = ref(false);
const showDeleteConfirmDialog = ref(false);
const showMembershipDialog = ref(false);
const isDeletingWorkspace = ref(false);
const workspaceMainRef = ref<HTMLElement | null>(null);
const scrollToBottomTrigger = ref(0);
const selectedSendTo = ref<'all' | string>('all');
const selectedMode = ref<PromptMode>('chat');
const showSimulationGraph = ref(false);

const isSimulationWorkspace = computed((): boolean => {
  const wf = workspace.value?.workflow;
  return Boolean(wf && typeof wf === 'object' && (wf as { type?: string }).type === 'simulation');
});

const isSimulationRunning = computed((): boolean => {
  const wf = workspace.value?.workflow;
  if (!wf || typeof wf !== 'object') {
    return false;
  }
  const sim = wf as SimulationWorkflow;
  return sim.type === 'simulation' && sim.status === 'running';
});

const PROMPT_MODE_OPTIONS: ModeOption[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'debate', label: 'Debate' },
  { value: 'questionnaire', label: 'Questionnaire' },
];

const { personasAll, loadPersonas } = usePersonas();
const { allCohorts, loadAllCohorts } = useCohorts();

const sendToOptions = computed(() => {
  const conversation = workspace.value?.conversation;
  if (!conversation) {
    return [];
  }
  const personaIds = conversation.persona_ids ?? [];
  const cohortIds = conversation.cohort_ids ?? [];
  const personaOptions = personaIds.map(id => ({
    value: id,
    label: personasAll.value.find(p => p.id === id)?.name ?? id,
    type: 'persona' as const,
  }));
  const cohortOptions = cohortIds.map(id => ({
    value: id,
    label: allCohorts.value.find(c => c.id === id)?.name ?? id,
    type: 'cohort' as const,
  }));
  return [...personaOptions, ...cohortOptions];
});

function scrollWorkspaceMainToBottom() {
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = workspaceMainRef.value;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        }, 150);
      });
    });
  });
}

onMounted(async () => {
  workspaces.value = await fetchWorkspaces(false, { storeResult: false });
});

function handleWorkspaceSelect(id: string) {
  router.push({ name: 'workspace', params: { id } });
}

async function handleAddWorkspace() {
  if (isCreatingWorkspace.value) {
    return;
  }
  isCreatingWorkspace.value = true;
  try {
    const { id } = await upsertWorkspaceConversation(
      { name: '', messages: [] },
      'New workspace',
      ''
    );
    workspaces.value = await fetchWorkspaces(false, { storeResult: false });
    router.push({ name: 'workspace', params: { id } });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
  } finally {
    isCreatingWorkspace.value = false;
  }
}

function openDeleteConfirmDialog() {
  showDeleteConfirmDialog.value = true;
}

async function handleConfirmDeleteWorkspace() {
  const workspaceToDelete = workspace.value;
  if (!workspaceToDelete?.id || isDeletingWorkspace.value) {
    return;
  }
  isDeletingWorkspace.value = true;
  try {
    await deleteWorkspaceApi(workspaceToDelete.id);
    showDeleteConfirmDialog.value = false;
    workspaces.value = await fetchWorkspaces(false, { storeResult: false });
    const remaining = workspaces.value;
    if (remaining.length > 0) {
      router.push({ name: 'workspace', params: { id: remaining[0].id } });
    } else {
      router.push({ name: 'workspaces' });
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to delete workspace');
  } finally {
    isDeletingWorkspace.value = false;
  }
}

async function handleMembershipSave(payload: { personaIds: string[]; cohortIds: string[] }) {
  const current = workspace.value;
  if (!current?.conversation) {
    return;
  }
  try {
    const conversation = {
      ...current.conversation,
      persona_ids: payload.personaIds,
      cohort_ids: payload.cohortIds,
    };
    await upsertWorkspaceConversation(conversation, current.name, current.description, current.id);
    workspace.value = { ...current, conversation };
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to save workspace membership');
  }
}

const canSend = computed(
  () => hasPersonasOrCohorts.value && (status.value === 'ready' || status.value === 'error')
);

function mapConversationMessages(rawMessages: ConversationMessage[]): ConversationMessage[] {
  return rawMessages.map((msg: ConversationMessage) => {
    if (msg.role !== 'assistant' || !msg.content?.trim().startsWith('{')) {
      return { ...msg };
    }
    if (parseInlineReportPayload(msg.content)) {
      return { ...msg };
    }
    const parsed = parsePersonaResponseContent(msg.content);
    if (parsed) {
      return { ...msg, content: parsed.content, followup: parsed.followup ?? msg.followup };
    }
    return { ...msg };
  });
}

const simulationPollIntervalMs = 2000;
let simulationPollIntervalId: ReturnType<typeof setInterval> | null = null;

async function refreshWorkspaceForSimulation() {
  const id = currentWorkspaceId.value;
  if (!id) {
    return;
  }
  try {
    const next = await fetchWorkspace(id);
    workspace.value = next;
    messages.value = mapConversationMessages(next.conversation?.messages ?? []);
    scrollToBottomTrigger.value = Date.now();
  } catch {
    // ignore poll errors
  }
}

const loadWorkspace = async (id: string | undefined) => {
  if (!id) {
    workspace.value = null;
    isLoading.value = false;
    error.value = 'No workspace ID';
    messages.value = [];
    selectedSendTo.value = 'all';
    selectedMode.value = 'chat';
    showSimulationGraph.value = false;
    return;
  }
  isLoading.value = true;
  error.value = null;
  selectedSendTo.value = 'all';
  selectedMode.value = 'chat';
  showSimulationGraph.value = false;
  try {
    workspace.value = await fetchWorkspace(id);
    const conversation = workspace.value.conversation;
    if (
      conversation &&
      ((conversation.persona_ids?.length ?? 0) > 0 || (conversation.cohort_ids?.length ?? 0) > 0)
    ) {
      loadPersonas(false);
      loadAllCohorts();
    }
    messages.value = mapConversationMessages(workspace.value.conversation?.messages ?? []);
    if (isSimulationWorkspace.value) {
      showSimulationGraph.value = true;
    }
  } catch (err) {
    workspace.value = null;
    messages.value = [];
    error.value = err instanceof Error ? err.message : 'Failed to load workspace';
  } finally {
    isLoading.value = false;
    scrollToBottomTrigger.value = Date.now();
  }
};

watch(
  () => route.params.id as string | undefined,
  id => loadWorkspace(id),
  { immediate: true }
);

watch(
  [isSimulationRunning, currentWorkspaceId],
  ([running, id]) => {
    if (simulationPollIntervalId !== null) {
      clearInterval(simulationPollIntervalId);
      simulationPollIntervalId = null;
    }
    if (running && id) {
      simulationPollIntervalId = setInterval(
        refreshWorkspaceForSimulation,
        simulationPollIntervalMs
      );
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (simulationPollIntervalId !== null) {
    clearInterval(simulationPollIntervalId);
    simulationPollIntervalId = null;
  }
});

watch(
  () => [selectedSendTo.value, sendToOptions.value] as const,
  ([sendTo, options]) => {
    if (sendTo !== 'all' && options.length > 0 && !options.some(o => o.value === sendTo)) {
      selectedSendTo.value = 'all';
    }
  }
);

function dataUrlToMessageFile(
  url: string,
  mimeType: string,
  name?: string
): { data: string; mimeType: string; name?: string } | null {
  if (!url.startsWith('data:')) {
    return null;
  }
  const commaIndex = url.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }
  const base64 = url.slice(commaIndex + 1);
  const mimePart = url.slice(5, commaIndex);
  const mimeMatch = mimePart.match(/^([^;]+)/);
  const resolvedMime = mimeMatch ? mimeMatch[1].trim() : mimeType;
  return { data: base64, mimeType: resolvedMime, name };
}

async function filesToMessageFiles(
  payloadFiles: PromptInputMessage['files']
): Promise<Array<{ data: string; mimeType: string; name?: string }>> {
  const result: Array<{ data: string; mimeType: string; name?: string }> = [];
  for (const item of payloadFiles) {
    const url = typeof item.url === 'string' ? item.url : '';
    const mimeType = (item as { mediaType?: string }).mediaType || 'application/octet-stream';
    const name = item.filename || (item as { name?: string }).name;
    const file = dataUrlToMessageFile(url, mimeType, name);
    if (file) {
      result.push(file);
    }
  }
  return result;
}

async function handleSubmit(payload: PromptInputMessage) {
  if (status.value === 'submitted' || status.value === 'streaming') {
    return;
  }
  if (!hasPersonasOrCohorts.value || !workspace.value) {
    toast.error('Add at least one persona or cohort to this workspace to chat');
    return;
  }
  const userMessageId = nanoid();
  const answerMessageId = nanoid();
  const questionText = payload.text?.trim() ?? '';
  const hasText = !!questionText;
  const hasAttachments = (payload.files?.length ?? 0) > 0;
  if (!hasText && !hasAttachments) {
    return;
  }

  const files = await filesToMessageFiles(payload.files);

  const userMessage: ConversationMessage = {
    id: userMessageId,
    role: 'user',
    content: questionText || '(attachment)',
  };
  if (files.length) {
    userMessage.files = files;
  }

  const assistantMessage: ConversationMessage = {
    id: answerMessageId,
    role: 'assistant',
    content: '',
    isPending: true,
  };

  const list = messages.value.slice();
  const lastAssistantIndex = list.map(m => m.role).lastIndexOf('assistant');
  if (lastAssistantIndex >= 0 && list[lastAssistantIndex].followup?.length) {
    list[lastAssistantIndex] = {
      ...list[lastAssistantIndex],
      followup: undefined,
    };
  }
  messages.value = [...list, userMessage, assistantMessage];
  status.value = 'submitted';

  let rawTextBuffer = '';

  const onChunk = async (
    text: string,
    messageData?: {
      content?: string | string[] | Array<{ persona_id: string; name?: string; content: string }>;
      followup?: string[];
    }
  ) => {
    if (status.value === 'submitted') {
      status.value = 'streaming';
    }
    const messagesList = messages.value.slice();
    const index = messagesList.findIndex(m => m.role === 'assistant' && m.id === answerMessageId);
    if (index === -1) {
      return;
    }
    const existing = messagesList[index];
    if (messageData && typeof messageData.content !== 'undefined') {
      const incoming = messageData.content;
      const isMultiSpeaker =
        Array.isArray(incoming) &&
        incoming.length > 0 &&
        typeof incoming[0] === 'object' &&
        incoming[0] !== null &&
        'persona_id' in (incoming[0] as object);
      let mergedContent: typeof incoming;
      if (isMultiSpeaker) {
        const currentReplies = parseStructuredContent(existing.content);
        mergedContent = (
          incoming as Array<{ persona_id: string; name?: string; content: string }>
        ).map(inc => {
          const existingReply = currentReplies.find(r => r.persona_id === inc.persona_id);
          const content =
            (inc.content ?? '').trim() !== '' ? inc.content : (existingReply?.content ?? '');
          return { ...inc, content: content ?? '' };
        });
      } else {
        mergedContent = incoming;
      }
      const content = JSON.stringify({
        content: mergedContent,
        followup: messageData.followup ?? [],
      });
      messagesList[index] = {
        ...existing,
        content,
        followup: messageData.followup,
      };
      messages.value = messagesList;
      await nextTick();
      return;
    }
    if (text && text.trim()) {
      rawTextBuffer += text;
      messagesList[index] = {
        ...existing,
        content: rawTextBuffer.trim(),
      };
      messages.value = messagesList;
      await nextTick();
    }
  };

  const questionPayload: Parameters<typeof fetchPromptAsk>[2] = {
    question: questionText,
    files: files.length ? files : undefined,
  };
  if (selectedSendTo.value !== 'all') {
    const option = sendToOptions.value.find(o => o.value === selectedSendTo.value);
    if (option?.type === 'cohort') {
      questionPayload.cohort_ids = [option.value];
    } else {
      questionPayload.persona_ids = [option?.value ?? selectedSendTo.value];
    }
  }

  const isReportMode =
    selectedMode.value === 'feedback' ||
    selectedMode.value === 'debate' ||
    selectedMode.value === 'questionnaire';

  try {
    if (isReportMode) {
      const currentWorkspace = workspace.value;
      if (!currentWorkspace) {
        return;
      }
      const conversation = currentWorkspace.conversation;
      const sendToOption = sendToOptions.value.find(o => o.value === selectedSendTo.value);
      const personaIds =
        selectedSendTo.value !== 'all' && sendToOption?.type === 'persona'
          ? [sendToOption.value]
          : (conversation?.persona_ids ?? []);
      const cohortIds =
        selectedSendTo.value !== 'all' && sendToOption?.type === 'cohort'
          ? [sendToOption.value]
          : (conversation?.cohort_ids ?? []);

      const reportRequest: Parameters<typeof startReportGeneration>[0] = {
        prompt: questionText,
        persona_ids: personaIds,
        cohort_ids: cohortIds.length > 0 ? cohortIds : undefined,
        report_type: selectedMode.value as InlineReportType,
        workspace_id: currentWorkspace.id,
        files:
          files.length > 0
            ? files.map(f => ({ data: f.data, mimeType: f.mimeType, name: f.name }))
            : undefined,
      };

      const { report_id } = await startReportGeneration(reportRequest);

      const reportContent = serialiseInlineReportPayload({
        type: 'report',
        reportId: report_id,
        reportType: selectedMode.value as InlineReportType,
        status: 'loading',
      });

      const messagesList = messages.value.slice();
      const reportMessageIndex = messagesList.findIndex(
        m => m.id === answerMessageId && m.role === 'assistant'
      );
      if (reportMessageIndex !== -1) {
        messagesList[reportMessageIndex] = {
          ...messagesList[reportMessageIndex],
          content: reportContent,
          isPending: false,
        };
        messages.value = messagesList;
      }

      status.value = 'ready';

      const conv = workspace.value?.conversation;
      if (workspace.value && conv) {
        try {
          await upsertWorkspaceConversation(
            { ...conv, messages: messages.value },
            workspace.value.name,
            workspace.value.description,
            workspace.value.id
          );
        } catch (persistErr) {
          toast.error(
            persistErr instanceof Error ? persistErr.message : 'Failed to save conversation'
          );
        }
      }
      return;
    }

    const structuredPayload = await fetchPromptAsk(
      userMessageId,
      answerMessageId,
      questionPayload,
      workspace.value.id,
      onChunk
    );
    if (structuredPayload?.content !== undefined) {
      const messagesList = messages.value.slice();
      const index = messagesList.findIndex(m => m.id === answerMessageId && m.role === 'assistant');
      if (index !== -1) {
        const existing = messagesList[index];
        const contentToStore =
          Array.isArray(structuredPayload.content) &&
          structuredPayload.content.length > 0 &&
          typeof structuredPayload.content[0] === 'object' &&
          structuredPayload.content[0] !== null &&
          'persona_id' in (structuredPayload.content[0] as object)
            ? JSON.stringify({
                content: structuredPayload.content,
                followup: structuredPayload.followup ?? [],
              })
            : typeof structuredPayload.content === 'string'
              ? structuredPayload.content
              : '';
        messagesList[index] = {
          ...existing,
          content: contentToStore,
          followup: structuredPayload.followup,
          isPending: false,
        };
        messages.value = messagesList;
      }
    }
  } catch (err) {
    status.value = 'error';
    const messagesList = messages.value;
    const last = messagesList[messagesList.length - 1];
    if (last && last.role === 'assistant' && last.id === answerMessageId) {
      const updated: ConversationMessage = {
        ...last,
        isError: true,
        content: last.content || (err instanceof Error ? err.message : 'Failed to send'),
      };
      messages.value = [...messagesList.slice(0, -1), updated];
    }
    toast.error(err instanceof Error ? err.message : 'Failed to send message');
  } finally {
    const messagesList = messages.value.slice();
    const index = messagesList.findIndex(m => m.id === answerMessageId && m.role === 'assistant');
    if (index !== -1) {
      const existingMsg = messagesList[index];
      if (existingMsg.isPending) {
        messagesList[index] = {
          ...existingMsg,
          content: rawTextBuffer.trim() || existingMsg.content,
          isPending: false,
        };
        messages.value = messagesList;
      }
    }
    status.value = 'ready';

    const conversation = workspace.value?.conversation;
    if (workspace.value && conversation) {
      try {
        await upsertWorkspaceConversation(
          { ...conversation, messages: messages.value },
          workspace.value.name,
          workspace.value.description,
          workspace.value.id
        );
      } catch (persistErr) {
        toast.error(
          persistErr instanceof Error ? persistErr.message : 'Failed to save conversation'
        );
      }
    }
  }
}

function handlePromptError(payload: { code: string; message: string }) {
  toast.error(payload.message);
}

function handleSuggestionClick(suggestion: string) {
  handleSubmit({ text: suggestion, files: [] });
}

async function handleDeleteMessage(messageId: string) {
  messages.value = messages.value.filter(m => m.id !== messageId);
  const conversation = workspace.value?.conversation;
  if (workspace.value && conversation) {
    try {
      await upsertWorkspaceConversation(
        { ...conversation, messages: messages.value },
        workspace.value.name,
        workspace.value.description,
        workspace.value.id
      );
    } catch (persistErr) {
      toast.error(persistErr instanceof Error ? persistErr.message : 'Failed to save conversation');
    }
  }
}

async function handleUpdateReportPayload(messageId: string, payload: InlineReportMessagePayload) {
  const index = messages.value.findIndex(m => m.id === messageId);
  if (index === -1) {
    return;
  }
  const list = messages.value.slice();
  list[index] = {
    ...list[index],
    content: serialiseInlineReportPayload(payload),
  };
  messages.value = list;
  const conversation = workspace.value?.conversation;
  if (workspace.value && conversation) {
    try {
      await upsertWorkspaceConversation(
        { ...conversation, messages: messages.value },
        workspace.value.name,
        workspace.value.description,
        workspace.value.id
      );
    } catch (persistErr) {
      toast.error(persistErr instanceof Error ? persistErr.message : 'Failed to save conversation');
    }
  }
}

function parseStructuredContent(
  raw: string | undefined
): Array<{ persona_id: string; name?: string; content: string }> {
  const trimmed = (raw ?? '').trim();
  if (!trimmed.startsWith('{')) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      content?: Array<{ persona_id: string; name?: string; content: string }>;
    };
    const content = parsed?.content;
    if (
      !Array.isArray(content) ||
      content.length === 0 ||
      typeof content[0] !== 'object' ||
      content[0] === null ||
      !('persona_id' in content[0])
    ) {
      return [];
    }
    return content;
  } catch {
    return [];
  }
}

function parsePersonaResponseContent(raw: string): { content: string; followup?: string[] } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      content?: string | string[] | Array<{ persona_id: string; name?: string; content: string }>;
      followup?: string[];
    };
    if (parsed && (parsed.content !== undefined || Array.isArray(parsed.followup))) {
      const rawContent = parsed.content;
      const isMultiSpeaker =
        Array.isArray(rawContent) &&
        rawContent.length > 0 &&
        typeof rawContent[0] === 'object' &&
        rawContent[0] !== null &&
        'persona_id' in (rawContent[0] as object);
      if (isMultiSpeaker) {
        return null;
      }
      const content = Array.isArray(rawContent)
        ? (rawContent as string[]).join('\n\n')
        : typeof rawContent === 'string'
          ? rawContent
          : '';
      return {
        content,
        followup: Array.isArray(parsed.followup) ? parsed.followup : undefined,
      };
    }
  } catch {
    // Fallback: extract content and followup when model output is malformed (e.g. extra quotes)
    const result = extractContentAndFollowupFromStream(trimmed);
    if (result) {
      return result;
    }
  }
  return null;
}

function extractContentAndFollowupFromStream(
  jsonLike: string
): { content: string; followup?: string[] } | null {
  let content = '';
  let followup: string[] | undefined;
  const contentKey = '"content"';
  const followupKey = '"followup"';
  const contentIndex = jsonLike.indexOf(contentKey);
  const followupIndex = jsonLike.indexOf(followupKey);
  if (contentIndex === -1) {
    return null;
  }
  const afterContentKey = jsonLike.slice(contentIndex + contentKey.length);
  const contentValueStart = afterContentKey.search(/\S/);
  if (contentValueStart === -1) {
    return null;
  }
  const contentValueSlice = afterContentKey.slice(contentValueStart);
  if (contentValueSlice.startsWith('[')) {
    const contentArray = extractArrayBracketBalanced(contentValueSlice);
    if (contentArray !== null) {
      try {
        const parsed = JSON.parse('[' + contentArray + ']') as string[];
        content = parsed.join('\n\n');
      } catch {
        content = extractFirstContentString(contentArray);
      }
    }
  } else if (contentValueSlice.startsWith('"')) {
    const firstString = extractFirstJsonString(contentValueSlice);
    if (firstString !== null) {
      content = firstString;
    }
  }
  if (followupIndex !== -1) {
    const afterFollowupKey = jsonLike.slice(followupIndex + followupKey.length);
    const followupValueStart = afterFollowupKey.search(/\S/);
    if (followupValueStart !== -1 && afterFollowupKey.slice(followupValueStart).startsWith('[')) {
      const followupArray = extractArrayBracketBalanced(afterFollowupKey.slice(followupValueStart));
      if (followupArray !== null) {
        try {
          followup = JSON.parse('[' + followupArray + ']') as string[];
        } catch {
          followup = extractStringArrayLenient(followupArray);
        }
      }
    }
  }
  if (content === '' && !followup?.length) {
    return null;
  }
  return { content, followup };
}

function extractArrayBracketBalanced(str: string): string | null {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '[') {
      if (depth === 0) {
        start = i + 1;
      }
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return str.slice(start, i);
      }
    }
  }
  return null;
}

function extractFirstJsonString(str: string): string | null {
  if (!str.startsWith('"')) {
    return null;
  }
  let i = 1;
  while (i < str.length) {
    if (str[i] === '\\') {
      i += 2;
      continue;
    }
    if (str[i] === '"') {
      try {
        return JSON.parse(str.slice(0, i + 1));
      } catch {
        return str.slice(1, i);
      }
    }
    i += 1;
  }
  return null;
}

function extractFirstContentString(arrayContent: string): string {
  const first = extractFirstJsonString(arrayContent.trim());
  return (first ?? arrayContent.replace(/^["\s,]+|["\s,]+$/g, '').replace(/\\"/g, '"')) || '';
}

function extractStringArrayLenient(arrayContent: string): string[] {
  const result: string[] = [];
  let rest = arrayContent.trim();
  while (rest.length > 0) {
    if (rest.startsWith(',')) {
      rest = rest.slice(1).trim();
      continue;
    }
    const first = extractFirstJsonString(rest);
    if (first !== null) {
      result.push(first);
      const consumed = consumeOneJsonString(rest);
      rest = rest.slice(consumed).trim();
    } else {
      break;
    }
  }
  return result;
}

function consumeOneJsonString(str: string): number {
  const trimmed = str.trim();
  if (!trimmed.startsWith('"')) {
    return 0;
  }
  let i = 1;
  while (i < trimmed.length) {
    if (trimmed[i] === '\\') {
      i += 2;
      continue;
    }
    if (trimmed[i] === '"') {
      return trimmed.slice(0, i + 1).length;
    }
    i += 1;
  }
  return 0;
}
</script>

<template>
  <div class="workspace-layout">
    <div ref="workspaceMainRef" class="workspace-main">
      <div class="mx-auto">
        <div v-if="isLoading" class="flex justify-center py-12">
          <Loader :size="24" />
        </div>
        <Alert v-else-if="error" variant="destructive">
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <template v-else-if="workspace">
          <WorkspaceHeader
            :workspaces="workspaces"
            :current-workspace-id="currentWorkspaceId"
            :current-workspace-name="currentWorkspaceName"
            :is-creating-workspace="isCreatingWorkspace"
            :is-simulation-workspace="isSimulationWorkspace"
            :show-simulation-graph="showSimulationGraph"
            @add-workspace="handleAddWorkspace"
            @select-workspace="handleWorkspaceSelect"
            @open-membership-dialog="showMembershipDialog = true"
            @open-delete-confirm-dialog="openDeleteConfirmDialog"
            @update:show-simulation-graph="showSimulationGraph = $event"
          />
          <Dialog
            :open="showDeleteConfirmDialog"
            @update:open="(value: boolean) => (showDeleteConfirmDialog = value)"
          >
            <DialogContent :show-close-button="false">
              <DialogTitle>Delete workspace?</DialogTitle>
              <DialogDescription>
                This cannot be undone. The workspace and its conversation will be permanently
                removed.
              </DialogDescription>
              <DialogFooter>
                <Button type="button" variant="outline" @click="showDeleteConfirmDialog = false">
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  :disabled="isDeletingWorkspace"
                  @click="handleConfirmDeleteWorkspace"
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <WorkspaceMembershipDialog
            :open="showMembershipDialog"
            :conversation="workspace.conversation ?? null"
            @update:open="showMembershipDialog = $event"
            @save="handleMembershipSave"
          />
          <WorkspaceSimulationGraph
            v-if="showSimulationGraph"
            :workspace="workspace"
            :personas-all="personasAll"
          />
          <div v-else class="pt-24">
            <div
              v-if="!hasPersonasOrCohorts"
              class="mt-4 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground max-w-xl mx-auto"
            >
              Add a persona or cohort to this workspace to start.
            </div>
            <div v-else class="mt-4 flex flex-col gap-4">
              <WorkspaceConversation
                :messages="messages"
                :scroll-to-bottom-trigger="scrollToBottomTrigger"
                @delete-message="handleDeleteMessage"
                @scroll-to-bottom-ready="scrollWorkspaceMainToBottom"
                @suggestion-click="handleSuggestionClick"
                @update-report-payload="handleUpdateReportPayload"
              />
            </div>
            <div class="workspace-prompt-spacer" aria-hidden="true" />
          </div>
        </template>
      </div>
    </div>
    <template v-if="workspace && !showSimulationGraph && !isSimulationWorkspace">
      <WorkspacePrompt
        v-model:send-to="selectedSendTo"
        v-model:mode="selectedMode"
        :can-send="canSend"
        :send-to-options="sendToOptions"
        :mode-options="PROMPT_MODE_OPTIONS"
        :status="status"
        @submit="handleSubmit"
        @error="handlePromptError"
      />
    </template>
  </div>
</template>

<style scoped>
.workspace-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
}

.workspace-main {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.workspace-prompt-spacer {
  min-height: 20rem;
}
</style>
