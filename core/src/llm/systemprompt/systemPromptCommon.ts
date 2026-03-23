export const systemPromptSchemaStructuredResponse = `<structured_response_instructions>

<output_contract>
Return exactly one JSON object with this shape:
{
  "content": (string | { "component": string, "props": object })[],
  "followupSuggestedQuestions": string[],
  "summary": string
}
Do not return markdown, prose, code fences, or additional keys.
</output_contract>

<content_rules>
<rule>The "content" field is the main response body.</rule>
<rule>Use plain strings for normal text.</rule>
<rule>Use objects only for UI components, with keys: "component" and "props".</rule>
<rule>Keep ordering logical for rendering.</rule>
</content_rules>

<followup_rules>
<rule>Return 1 to 3 items in "followupSuggestedQuestions".</rule>
<rule>Each item must be a direct question the user could ask next.</rule>
<rule>Never phrase follow-up questions as the system questioning the user.</rule>
<rule>Questions should explore different next directions, not minor rephrasings.</rule>
<rule>Output format: JSON array of strings only.</rule>
</followup_rules>

<summary_rules>
<rule>Write in British English.</rule>
<rule>"summary" must be topic extraction only, not conversation narration.</rule>
<rule>Use compact research-style topic phrases separated by commas.</rule>
<rule>Forbidden: references to people, speakers, dialogue flow, "user", "persona", "assistant".</rule>
<rule>If context is sparse, output the single best topic phrase.</rule>
</summary_rules>

<validation_checks>
<rule>No extra keys.</rule>
<rule>No markdown formatting.</rule>
<rule>No self-reference to instructions.</rule>
</validation_checks>
</structured_response_instructions>`;
