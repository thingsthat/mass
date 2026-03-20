/**
 * System prompts for unified report generation
 */

import { getCurrentDateSystemPrompt } from 'core/src/llm/systemprompt/systemPromptHelper';
import { systemPromptDebateReport } from 'core/src/reports/llm/controllers/report-type-debate/systemPromptsReportTypeDebate';
import { systemPromptFeedbackReport } from 'core/src/reports/llm/controllers/report-type-feedback/systemPromptsReportTypeFeedback';
import { systemPromptIdeasReport } from 'core/src/reports/llm/controllers/report-type-ideas/systemPromptsReportTypeIdeas';
import { systemPromptQuestionnaireReport } from 'core/src/reports/llm/controllers/report-type-questionnaire/systemPromptsReportTypeQuestionnaire';

import type { ReportType } from 'core/src/reports/reports.types';

/**
 * Extract the core instructions from a report prompt (everything except the opening role block)
 */
function extractCoreInstructions(prompt: string): string {
  const roleEnd = prompt.indexOf('</role>');
  if (roleEnd >= 0) {
    return prompt.slice(roleEnd + 7).trim();
  }
  const lines = prompt.split('\n');
  const firstLineIndex = lines.findIndex(
    line => line.includes('You are an expert analyst') || line.includes('You are analyzing')
  );
  if (firstLineIndex >= 0) {
    return lines
      .slice(firstLineIndex + 1)
      .join('\n')
      .trim();
  }
  return prompt;
}

/**
 * System prompt for generating unified reports that combine multiple report types
 */
export const systemPromptUnifiedReport = (reportTypes: ReportType[]): string => {
  const hasFeedback = reportTypes.includes('feedback');
  const hasDebate = reportTypes.includes('debate');
  const hasQuestionnaire = reportTypes.includes('questionnaire');
  const hasIdeas = reportTypes.includes('ideas');

  const activeTypes = reportTypes.filter(type =>
    ['feedback', 'debate', 'questionnaire', 'ideas'].includes(type)
  );
  const typeCount = activeTypes.length;

  const typeNames = activeTypes.map(type => {
    if (type === 'feedback') {
      return 'individual feedback responses';
    }
    if (type === 'debate') {
      return 'a group debate discussion';
    }
    if (type === 'questionnaire') {
      return 'questionnaire results';
    }
    if (type === 'ideas') {
      return 'generated ideas';
    }
    return type;
  });

  const typeInstructions: string[] = [];
  if (hasFeedback) {
    typeInstructions.push(
      `<feedback_analysis_requirements>\n${extractCoreInstructions(systemPromptFeedbackReport())}\n</feedback_analysis_requirements>`
    );
  }
  if (hasDebate) {
    typeInstructions.push(
      `<debate_analysis_requirements>\n${extractCoreInstructions(systemPromptDebateReport())}\n</debate_analysis_requirements>`
    );
  }
  if (hasQuestionnaire) {
    typeInstructions.push(
      `<questionnaire_analysis_requirements>\n${extractCoreInstructions(systemPromptQuestionnaireReport())}\n</questionnaire_analysis_requirements>`
    );
  }
  if (hasIdeas) {
    typeInstructions.push(
      `<ideas_analysis_requirements>\n${extractCoreInstructions(systemPromptIdeasReport())}\n</ideas_analysis_requirements>`
    );
  }

  return `<role>
You are an expert analyst creating a comprehensive report from persona data.${typeCount > 1 ? ` You are analyzing ${typeNames.join(', ')} on the same topic. Create a comprehensive unified report that combines insights from all ${typeCount} analysis types.` : ''}
</role>
${
  typeCount > 1
    ? `
<unified_synthesis_requirements>
<requirement>Synthesize insights from all provided data sources</requirement>
<requirement>Compare and contrast perspectives across different analysis formats</requirement>
<requirement>Identify how different formats reveal complementary or contrasting insights</requirement>
<requirement>Show where findings align or diverge across analysis types</requirement>
<requirement>Highlight unique insights that emerged from each format</requirement>
<requirement>Create a cohesive narrative that weaves together all data sources</requirement>
</unified_synthesis_requirements>
`
    : ''
}
${typeInstructions.join('\n\n')}

<core_requirements>
<requirement>Comprehensive summary of overall trends and patterns</requirement>
<requirement>Notable quotes and perspectives that represent key viewpoints</requirement>
<requirement>Areas of consensus and disagreement</requirement>
<requirement>Demographic patterns in responses (age, occupation, background)</requirement>
<requirement>Actionable next steps and recommendations</requirement>
<requirement>Quantitative analysis with statistical insights</requirement>
<requirement>Confidence summary with detailed metrics and explanations</requirement>
</core_requirements>

<confidence_analysis_requirements>
<requirement>Calculate average confidence ratings with context and meaning</requirement>
<requirement>Analyze confidence patterns by sentiment (positive, neutral, negative)</requirement>
<requirement>Write narrative paragraphs explaining what confidence patterns reveal</requirement>
<requirement>Explain the significance of confidence variations and what they mean for the topic</requirement>
<requirement>Focus on insights and explanations rather than raw data</requirement>
<requirement>Structure as flowing paragraphs that explain the "what" and "why"</requirement>
</confidence_analysis_requirements>

<formatting_requirements>
<rule>Title should be simple, concise, and neutral to the results</rule>
<rule>Title should be about the topic, NOT starting with "Report on" or "Analysis of"</rule>
<rule>Summary should NOT start with "The feedback" or "The responses" or "The ideas" or similar phrases</rule>
<rule>Use British English throughout</rule>
<rule>Maintain objective, data-driven insights while preserving authentic voices</rule>
<rule>Include statistical analysis and demographic correlations where relevant</rule>
</formatting_requirements>

<persona_id_preservation>
<rule>ALWAYS use the EXACT persona IDs (author_id) from the provided data</rule>
<rule>DO NOT create new or modified persona IDs</rule>
<rule>When referencing personas in quotes, sentiment groups, crowd wall, or ideas, use their original persona ID exactly as provided</rule>
<rule>The author_id field must match the persona_id from the input data precisely</rule>
</persona_id_preservation>

<files_handling>
If files were provided and opinions requested, incorporate file analysis. If choice between files was requested, indicate preference with A, B, C, D.
</files_handling>

<task_instruction>
Focus on providing comprehensive, actionable insights that capture the full depth and nuance of the persona responses while maintaining analytical rigor and objectivity.
</task_instruction>

${getCurrentDateSystemPrompt()}`;
};
