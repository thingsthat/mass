<script setup lang="ts">
import { computed } from 'vue';

import PersonaAvatar from 'frontend/src/components/PersonaAvatar.vue';
import MessageResponse from 'frontend/src/components/ai-elements/message/MessageResponse.vue';

import type { ReportResult } from 'core/src/reports/reports.types';

const props = defineProps<{
  report: ReportResult;
}>();

const hasSentimentGroups = computed(() => (props.report.sentiment_groups?.length ?? 0) > 0);
const hasCrowdWall = computed(() => (props.report.crowd_wall?.length ?? 0) > 0);
</script>

<template>
  <div class="flex flex-col gap-3 py-3">
    <h3 class="text-lg font-semibold">{{ report.title }}</h3>
    <p class="text-sm leading-relaxed">{{ report.summary }}</p>
    <p class="text-sm leading-relaxed">{{ report.verdict_summary }}</p>
    <blockquote
      v-if="report.verdict_best_quote"
      class="ml-4 border-l-2 border-border pl-2 text-sm text-muted-foreground"
    >
      {{ report.verdict_best_quote }}
    </blockquote>
    <div v-if="hasSentimentGroups" class="flex flex-col gap-3">
      <div
        v-for="(group, index) in report.sentiment_groups"
        :key="index"
        class="flex flex-col gap-1"
      >
        <span class="text-sm font-semibold capitalize">{{ group.type }}</span>
        <span class="text-xs text-muted-foreground">{{ group.percentage }}%</span>
        <ul v-if="group.quotes?.length" class="mt-2 flex list-none flex-col gap-2 text-xs">
          <li
            v-for="(quote, qIndex) in group.quotes.slice(0, 3)"
            :key="qIndex"
            class="flex flex-col gap-1 rounded-md border border-border bg-muted px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <PersonaAvatar
                :hash-key="quote.author_id"
                :loading="false"
                class="h-6 w-6 min-h-6 min-w-6"
              />
              <span class="text-xs font-semibold text-foreground">
                {{ quote.author_name }}
              </span>
            </div>
            <p class="text-xs leading-snug text-muted-foreground">
              {{ quote.text }}
            </p>
          </li>
        </ul>
      </div>
    </div>
    <div v-if="hasCrowdWall" class="mt-2">
      <h4 class="mb-1 text-sm font-semibold">Crowd wall</h4>
      <ul class="list-disc space-y-1 pl-5 text-sm">
        <li v-for="(item, index) in report.crowd_wall" :key="index" class="text-sm">
          <span class="font-medium">{{ item.author_name }}:</span>
          {{ item.text }}
        </li>
      </ul>
    </div>
    <div v-if="report.detailed" class="mt-2 text-sm">
      <MessageResponse :content="report.detailed" />
    </div>
  </div>
</template>

<style scoped></style>
