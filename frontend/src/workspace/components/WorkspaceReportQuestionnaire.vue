<script setup lang="ts">
import { computed } from 'vue';

import MessageResponse from 'frontend/src/components/ai-elements/message/MessageResponse.vue';

import type { ReportResult } from 'core/src/reports/reports.types';

const props = defineProps<{
  report: ReportResult;
}>();

const hasQuestionResults = computed(() => (props.report.question_results?.length ?? 0) > 0);
</script>

<template>
  <div class="workspace-report-questionnaire">
    <h3 class="workspace-report-title">{{ report.title }}</h3>
    <p class="workspace-report-summary">{{ report.summary }}</p>
    <p v-if="report.overall_summary" class="workspace-report-overall-summary">
      {{ report.overall_summary }}
    </p>
    <div v-if="hasQuestionResults" class="workspace-report-questions">
      <div
        v-for="result in report.question_results"
        :key="result.question_id"
        class="workspace-report-question-block"
      >
        <h4 class="workspace-report-question-text">{{ result.question_text }}</h4>
        <p class="workspace-report-question-meta">
          {{ result.total_responses }} response(s), {{ result.selection_type }}
        </p>
        <ul class="workspace-report-options">
          <li v-for="opt in result.options" :key="opt.option_id" class="workspace-report-option">
            <span class="workspace-report-option-text">{{ opt.option_text }}</span>
            <span class="workspace-report-option-stats"
              >{{ opt.count }} ({{ opt.percentage }}%)</span
            >
          </li>
        </ul>
      </div>
    </div>
    <div v-if="report.verdict_summary" class="workspace-report-verdict-block">
      <p class="workspace-report-verdict">{{ report.verdict_summary }}</p>
    </div>
    <div v-if="report.detailed" class="workspace-report-detailed">
      <MessageResponse :content="report.detailed" />
    </div>
  </div>
</template>

<style scoped>
.workspace-report-questionnaire {
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
.workspace-report-overall-summary {
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.workspace-report-questions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace-report-question-block {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border, #e4e4e7);
}

.workspace-report-question-text {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.workspace-report-question-meta {
  font-size: 0.75rem;
  color: var(--muted-foreground, #71717a);
  margin: 0 0 0.5rem;
}

.workspace-report-options {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}

.workspace-report-option {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.workspace-report-option-text {
  flex: 1 1 auto;
}

.workspace-report-option-stats {
  flex-shrink: 0;
  color: var(--muted-foreground, #71717a);
}

.workspace-report-verdict-block {
  margin-top: 0.5rem;
}

.workspace-report-verdict {
  font-size: 0.875rem;
  margin: 0;
}

.workspace-report-detailed {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}
</style>
