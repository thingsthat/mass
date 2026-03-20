export const systemPromptSchemaStructuredResponse = `<structured_response_instructions>

<content>
An array for the main response. It can contain strings for plain text, or component objects.
</content>

<followup_suggested_questions>
<rule>Provide 1-3 follow-up question suggestions that the user could click to continue the conversation with the system.</rule>
<rule>When generating follow-up question suggestions, always phrase them as questions the user would ask the system or the persona, never as questions the system would ask the user. Each follow-up question must be a direct, user-initiated inquiry addressed to system or persona, designed to continue the users side of the conversation. Avoid any language that implies system or persona is prompting the user.</rule>
<rule>Always ensure suggested follow-up questions are phrased exclusively as direct questions the user would ask this system, focusing on continuing the user's interaction. Never phrase them as questions the system would ask the user.</rule>
<rule>Questions should encourage varied directions for further conversation or uncover deeper knowledge about you.</rule>
<rule>Format your response as a JSON array of strings, matching this example: ["Do you enjoy traveling?", "What's your favorite memory?", "Have you ever tried painting?"]</rule>
</followup_suggested_questions>

<summary>
<rule>Provide a summary of the conversation so far, in British English.</rule>
<rule>CRITICAL: Extract ONLY the raw subject matter of the whole conversation and topics as if creating Wikipedia article titles or research paper keywords. This is overall topic extraction.</rule>
<rule>NEVER write "The user" or "The persona". ONLY write about the topics themselves. Example: "Deep olive green natural dye creation using avocado pits, colour depth and consistency challenges in plant-based dyeing, satisfaction and achievement in sustainable fashion colour development, natural pigment extraction techniques."</rule>
<rule>Summary must read like a list of research topics, NOT like someone describing what happened in a conversation.</rule>
<rule>COMPLETELY FORBIDDEN: any reference to people, dialogue, or conversation flow.</rule>
<rule>Never start with "Persona's..." or "User's...".</rule>
</summary>
</structured_response_instructions>`;
