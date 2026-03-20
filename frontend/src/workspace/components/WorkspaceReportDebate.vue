<script setup lang="ts">
import { computed } from 'vue';

import MessageResponse from 'frontend/src/components/ai-elements/message/MessageResponse.vue';

import type { ReportResult } from 'core/src/reports/reports.types';

const props = defineProps<{
  report: ReportResult;
}>();

const personaById = computed(() => {
  const map: Record<string, string> = {};
  for (const p of props.report.personas ?? []) {
    map[p.id] = p.value.name;
  }
  return map;
});

const hasDebate = computed(() => (props.report.debate?.length ?? 0) > 0);
const hasPersonas = computed(() => (props.report.personas?.length ?? 0) > 0);
</script>

<template>
  <div class="workspace-report-debate">
    <h3 class="workspace-report-title">{{ report.title }}</h3>
    <p class="workspace-report-summary">{{ report.summary }}</p>
    <p class="workspace-report-verdict">{{ report.verdict_summary }}</p>
    <blockquote v-if="report.verdict_best_quote" class="workspace-report-quote">
      {{ report.verdict_best_quote }}
    </blockquote>
    <div v-if="hasPersonas" class="workspace-report-personas">
      <h4 class="workspace-report-section-heading">Participants</h4>
      <ul class="workspace-report-personas-list">
        <li v-for="persona in report.personas" :key="persona.id" class="workspace-report-persona">
          {{ persona.value.name }}, {{ persona.value.age }}, {{ persona.value.occupation }}
        </li>
      </ul>
    </div>
    <div v-if="hasDebate" class="workspace-report-transcript">
      <h4 class="workspace-report-section-heading">Debate transcript</h4>
      <div class="workspace-report-debate-messages">
        <div
          v-for="(entry, index) in report.debate"
          :key="index"
          class="workspace-report-debate-message"
        >
          <span class="workspace-report-debate-author">
            {{ personaById[entry.author_id] ?? entry.author_id }}:
          </span>
          <span class="workspace-report-debate-text">{{ entry.text }}</span>
        </div>
      </div>
    </div>
    <div v-if="report.detailed" class="workspace-report-detailed">
      <MessageResponse :content="report.detailed" />
    </div>
  </div>
</template>

<style scoped>
.workspace-report-debate {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0;
}

.workspace-report-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.workspace-report-summary,
.workspace-report-verdict {
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.workspace-report-quote {
  margin: 0 0 0 1rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--border, #e4e4e7);
  font-size: 0.875rem;
  color: var(--muted-foreground, #71717a);
}

.workspace-report-section-heading {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.workspace-report-personas-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}

.workspace-report-persona {
  margin-bottom: 0.25rem;
}

.workspace-report-debate-messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.workspace-report-debate-message {
  font-size: 0.875rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border, #e4e4e7);
}

.workspace-report-debate-author {
  font-weight: 600;
  margin-right: 0.25rem;
}

.workspace-report-debate-text {
  line-height: 1.4;
}

.workspace-report-detailed {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}
</style>
