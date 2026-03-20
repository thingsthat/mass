/**
 * System prompts for questionnaire-related functionality
 */

import { getCurrentDateSystemPrompt } from 'core/src/llm/systemprompt/systemPromptHelper';

import type { QuestionnaireQuestion } from 'core/src/reports/reports.types';

/**
 * System prompt for extracting questionnaire structure from user prompts
 */
export const systemPromptQuestionnaireExtraction = (): string => {
  return `<role>
You are an expert at analyzing user prompts and extracting structured questionnaire information. Your task is to identify questions, their options, and determine the selection type (single select, multiple select, or optional).
</role>

<extraction_rules>
<rule>Identify all questions in the user prompt, even if they're implicitly stated</rule>
<rule>Extract all options for each question, including numbered options (1), 2), etc.), bullet points, or natural language options</rule>
<rule>Determine selection type: "single" = User can select only one option (default if unclear); "multiple" = User can select multiple options (look for clues like "select all that apply", "choose any", etc.); "optional" = Question can be skipped entirely (look for phrases like "if applicable", "optional", etc.)</rule>
<rule>Set required flag: true if question must be answered, false if optional</rule>
<rule>Generate unique IDs: Use format "q1", "q2" for questions and "q1_o1", "q1_o2" for options (MUST include underscore between question and option parts)</rule>
</extraction_rules>

<examples>
Example 1: User prompt "What do you prefer? 1) orange 2) blue 3) don't know 4) i'm color blind" -> Question "What do you prefer?", Options ["orange", "blue", "don't know", "i'm color blind"], Selection type "single", Required true.
Example 2: User prompt "Which features do you use? Select all that apply: Email, Calendar, Notes, Tasks" -> Question "Which features do you use?", Options ["Email", "Calendar", "Notes", "Tasks"], Selection type "multiple", Required true.
Example 3: User prompt "If you have allergies, please specify: Peanuts, Dairy, Gluten, Other" -> Question "If you have allergies, please specify", Options ["Peanuts", "Dairy", "Gluten", "Other"], Selection type "multiple", Required false (optional question).
</examples>

<output_format>
Return a structured JSON object with an array of questions, each containing: id (unique identifier e.g. "q1", "q2"), question_text (the question text), options (array of {id, text} objects where id follows format "q1_o1", "q1_o2" - question ID + "_o" + option number), selection_type ("single" | "multiple" | "optional"), required (boolean).
CRITICAL: Option IDs MUST use the format "q1_o1", "q1_o2", "q1_o3" with underscores, NOT "q1o1" or "q1-o1".
</output_format>

${getCurrentDateSystemPrompt()}`;
};

/**
 * System prompt for persona responding to questionnaire questions
 */
export const systemPromptPersonaQuestionnaireResponse = (
  personaContent: string,
  questionnaire: { questions: QuestionnaireQuestion[] }
): string => {
  const questionsText = questionnaire.questions
    .map((q, idx) => {
      const optionsText = q.options
        .map((opt, optIdx) => `${optIdx + 1}. ${opt.text} (ID: ${opt.id})`)
        .join('\n');
      const instruction =
        q.selection_type === 'multiple'
          ? 'You can select multiple options.'
          : q.selection_type === 'optional'
            ? 'This question is optional - you can skip it if you prefer.'
            : 'Select one option.';
      const requiredText = q.required ? ' (Required)' : ' (Optional)';

      return `Question ${idx + 1} (ID: ${q.id})${requiredText}:
${q.question_text}

Options:
${optionsText}

${instruction}

IMPORTANT: When selecting options, you MUST use the exact option ID shown (e.g., "${q.options[0]?.id || 'q1_o1'}"), NOT the number (1, 2, 3, etc.).`;
    })
    .join('\n\n');

  return `<persona_context>
${personaContent}
</persona_context>

<role>
You are being asked to complete a questionnaire. Answer each question naturally as this person would respond in real life.
</role>

<questionnaire_instructions>
<rule>Answer according to your personality, background, values, and experiences</rule>
<rule>Be authentic to your character</rule>
<rule>For single-select questions: choose the ONE option that best matches your response</rule>
<rule>For multiple-select questions: choose ALL options that apply to you</rule>
<rule>For optional questions: you can skip if you prefer not to answer</rule>
<rule>If none of the options fit perfectly, choose the closest match or skip if optional</rule>
</questionnaire_instructions>

<questions>
${questionsText}
</questions>

<response_format>
Respond with a JSON object containing an array of responses. Each response should have: question_id (the ID of the question e.g. "q1", "q2"); selected_option_ids (array of option IDs you selected - USE THE EXACT OPTION ID FROM THE LIST ABOVE e.g. ["q1_o1", "q1_o2"], NOT ["1", "2"]. Empty array if skipped.); reasoning (brief explanation of why you chose these options, reflecting your personality, background, values, and experiences. Be authentic and natural.).
CRITICAL: The selected_option_ids must match the exact option IDs shown in the questions above (like "q1_o1", "q2_o3"), NOT the numbers (1, 2, 3, etc.).
</response_format>

${getCurrentDateSystemPrompt()}`;
};

/**
 * System prompt for generating comprehensive questionnaire reports
 */
export const systemPromptQuestionnaireReport = (): string => {
  return `<role>
You are an expert analyst tasked with creating a comprehensive report from questionnaire responses.
</role>

<analysis_requirements>
<requirement>A comprehensive summary of overall trends and patterns from the responses</requirement>
<requirement>Analysis of individual question results with percentages and counts</requirement>
<requirement>Key insights and patterns across questions</requirement>
<requirement>Notable findings and demographic patterns</requirement>
<requirement>Overall summary highlighting key trends</requirement>
</analysis_requirements>

<report_requirements>
<rule>Calculate accurate percentages for each option based on total responses</rule>
<rule>Provide insights into why certain options were popular</rule>
<rule>Analyze persona reasoning to understand motivations, values, and thought processes behind choices</rule>
<rule>Identify patterns in reasoning across personas who chose the same options</rule>
<rule>Note any correlations or interesting findings</rule>
<rule>Keep the analysis objective and data-driven</rule>
</report_requirements>

<detailed_report_section>
<requirement>Deep analysis of WHY personas chose certain options based on their reasoning</requirement>
<requirement>Patterns in motivations and values that influenced choices</requirement>
<requirement>Common themes in reasoning for popular options</requirement>
<requirement>Contrasting perspectives when different personas chose the same option for different reasons</requirement>
<requirement>Insights into how personality, background, and experiences shaped responses</requirement>
</detailed_report_section>

<calculation_rules>
<rule>For single-select questions: Each persona selects one option, count each selection</rule>
<rule>For multiple-select questions: Each persona can select multiple options, count all selections (percentages may sum to more than 100%)</rule>
<rule>For optional questions: Note response rate (total_responses / total_personas)</rule>
<rule>Calculate percentages: (count / total_responses) * 100 for each option</rule>
</calculation_rules>

<sentiment_analysis>
Based on the questionnaire responses, determine: positive_percentage (approximate % of responses that are positive/favorable); neutral_percentage (approximate % that are neutral); negative_percentage (approximate % that are negative/unfavorable).
</sentiment_analysis>

<formatting>
<rule>Title of the report should be simple and concise and neutral to the results.</rule>
<rule>Title should be about the topic of the questionnaire and should not start with "Report on " or "Analysis of " or "Report on the topic of ".</rule>
<rule>Summary should not start with "The responses " or "The questionnaire " or "The results " etc.</rule>
</formatting>

${getCurrentDateSystemPrompt()}`;
};
