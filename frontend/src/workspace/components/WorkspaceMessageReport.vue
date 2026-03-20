<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { fetchReportById } from 'frontend/src/reports/reportsApi';
import WorkspaceReportDebate from 'frontend/src/workspace/components/WorkspaceReportDebate.vue';
import WorkspaceReportFeedback from 'frontend/src/workspace/components/WorkspaceReportFeedback.vue';
import WorkspaceReportQuestionnaire from 'frontend/src/workspace/components/WorkspaceReportQuestionnaire.vue';

import type { Report, ReportResult } from 'core/src/reports/reports.types';
import type { InlineReportMessagePayload } from 'core/src/workspace/conversation.types';

const POLL_INTERVAL_MS = 2500;

const props = defineProps<{
  payload: InlineReportMessagePayload;
}>();

const emit = defineEmits<{
  'update-payload': [payload: InlineReportMessagePayload];
}>();

const report = ref<Report | null>(null);
const fetchError = ref<string | null>(null);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const reportResult = computed((): ReportResult | null => {
  const r = report.value;
  if (!r?.report?.report) {
    return null;
  }
  return r.report.report as ReportResult;
});

const statusLabel = computed(() => {
  switch (props.payload.status) {
    case 'loading':
      return 'Loading report...';
    case 'completed':
      return 'Report ready';
    case 'failed':
      return props.payload.error ?? 'Report failed';
    default:
      return 'Report';
  }
});

const stopPolling = () => {
  if (pollTimer !== null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
};

const fetchReport = async () => {
  fetchError.value = null;
  try {
    const result = await fetchReportById(props.payload.reportId);
    return result;
  } catch (err) {
    fetchError.value = err instanceof Error ? err.message : 'Failed to load report';
    return null;
  }
};

const pollOnce = async () => {
  if (props.payload.status !== 'loading') {
    stopPolling();
    return;
  }
  const result = await fetchReport();
  if (!result) {
    return;
  }
  report.value = result;
  if (result.status === 'completed') {
    stopPolling();
    emit('update-payload', {
      type: 'report',
      reportId: props.payload.reportId,
      reportType: props.payload.reportType,
      status: 'completed',
    });
  } else if (result.status === 'failed') {
    stopPolling();
    const errorMessage = (result.report as { error?: string })?.error ?? 'Report failed';
    emit('update-payload', {
      type: 'report',
      reportId: props.payload.reportId,
      reportType: props.payload.reportType,
      status: 'failed',
      error: errorMessage,
    });
  }
};

const startPolling = () => {
  stopPolling();
  if (props.payload.status !== 'loading') {
    return;
  }
  const schedule = () => {
    pollTimer = setTimeout(async () => {
      await pollOnce();
      if (props.payload.status === 'loading' && pollTimer !== null) {
        schedule();
      }
    }, POLL_INTERVAL_MS);
  };
  schedule();
};

onMounted(async () => {
  if (props.payload.status === 'loading') {
    await pollOnce();
    startPolling();
  } else if (props.payload.status === 'completed') {
    await fetchReport().then(r => {
      if (r) {
        report.value = r;
      }
    });
  }
});

onUnmounted(() => {
  stopPolling();
});

watch(
  () => [props.payload.reportId, props.payload.status] as const,
  async ([reportId, status]) => {
    if (status === 'loading') {
      startPolling();
    } else if (status === 'completed' && report.value?.id !== reportId) {
      report.value = null;
      await fetchReport().then(r => {
        if (r) {
          report.value = r;
        }
      });
    }
  },
  { immediate: false }
);
</script>

<template>
  <div class="workspace-message-report">
    <template v-if="payload.status === 'loading' && !reportResult">
      <div class="workspace-message-report-header">
        <span class="workspace-message-report-type">{{ payload.reportType }}</span>
        <span class="workspace-message-report-status">{{ statusLabel }}</span>
      </div>
      <p v-if="fetchError" class="workspace-message-report-error">{{ fetchError }}</p>
    </template>
    <template v-else-if="payload.status === 'failed'">
      <div class="workspace-message-report-header">
        <span class="workspace-message-report-type">{{ payload.reportType }}</span>
        <span class="workspace-message-report-status workspace-message-report-status-failed">
          {{ statusLabel }}
        </span>
      </div>
    </template>
    <template v-else-if="reportResult">
      <WorkspaceReportFeedback v-if="payload.reportType === 'feedback'" :report="reportResult" />
      <WorkspaceReportDebate v-else-if="payload.reportType === 'debate'" :report="reportResult" />
      <WorkspaceReportQuestionnaire
        v-else-if="payload.reportType === 'questionnaire'"
        :report="reportResult"
      />
      <div v-else class="workspace-message-report-header">
        <span class="workspace-message-report-type">{{ payload.reportType }}</span>
        <span class="workspace-message-report-status">{{ statusLabel }}</span>
      </div>
    </template>
    <template v-else>
      <div class="workspace-message-report-header">
        <span class="workspace-message-report-type">{{ payload.reportType }}</span>
        <span class="workspace-message-report-status">{{ statusLabel }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.workspace-message-report {
  padding: 0.75rem 0;
}

.workspace-message-report-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.workspace-message-report-type {
  font-weight: 600;
  text-transform: capitalize;
}

.workspace-message-report-status {
  font-size: 0.875rem;
  color: var(--muted-foreground, #71717a);
}

.workspace-message-report-status-failed {
  color: var(--destructive, #dc2626);
}

.workspace-message-report-error {
  font-size: 0.875rem;
  color: var(--destructive, #dc2626);
  margin: 0.25rem 0 0;
}
</style>
