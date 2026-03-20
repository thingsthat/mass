import { log } from 'core/src/helpers/logger';
import { LLMRouter } from 'core/src/llm/router';
import { CohortWeightedConfig } from 'core/src/personas/cohort.types';
import { cohortConfigSchema } from 'core/src/personas/llm/controllers/cohort/schemaCohort';
import { systemPromptCohortConfig } from 'core/src/personas/llm/controllers/cohort/systemPromptsCohort';
import {
  EDUCATION_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  JOB_INFORMATION_OPTIONS,
  LANGUAGES_OPTIONS,
  LOCATION_OPTIONS,
  POLITICAL_LEANING_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from 'core/src/personas/options/personaOptions';
import { RELIGIONS_OPTIONS } from 'core/src/personas/options/religions';
import { v4 as uuidv4 } from 'uuid';

import type { ProviderId } from 'core/src/llm/config';

const MODEL = 'gemini-3-flash-preview';
const PROVIDER: ProviderId = 'google';

/**
 * Generate a cohort configuration based on a natural language prompt
 */
export async function generateCohortConfig(prompt: string): Promise<CohortWeightedConfig> {
  const systemPrompt =
    systemPromptCohortConfig() +
    `

Available options:
- Age ranges: Any range between 18-75
- Genders: ${GENDER_OPTIONS.join(', ')}
- Locations: ${LOCATION_OPTIONS.join(', ')}
- Ethnicities: ${ETHNICITY_OPTIONS.join(', ')}
- Languages: ${LANGUAGES_OPTIONS.join(', ')}
- Education levels: ${EDUCATION_OPTIONS.join(', ')}
- Job industries: ${JOB_INFORMATION_OPTIONS.join(', ')}
- Relationship statuses: ${RELATIONSHIP_STATUS_OPTIONS.join(', ')}
- Political leanings: ${POLITICAL_LEANING_OPTIONS.join(', ')}
- Religions: ${RELIGIONS_OPTIONS.join(', ')}
- Sexual orientations: ${SEXUAL_ORIENTATION_OPTIONS.join(', ')}

Note: Birth date, zodiac signs, height, and city are automatically generated based on other demographics, so they don't need to be weighted.`;

  const userPrompt = `Create a weighted demographic configuration for this cohort:

"${prompt}"

Analyze this description and provide appropriate weights for each demographic category that would create realistic personas matching this cohort. Explain your reasoning for the weighting decisions.`;

  try {
    const response = await LLMRouter.generate<CohortWeightedConfig>(PROVIDER, {
      messages: [
        { role: 'user', content: userPrompt, timestamp: new Date().toISOString(), id: uuidv4() },
      ],
      systemMessage: {
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString(),
        id: uuidv4(),
      },
      model: MODEL,
      responseFormat: cohortConfigSchema,
    });

    if (!response.data) {
      throw new Error('Expected structured response but got none');
    }

    return response.data;
  } catch (error) {
    log.error('COHORTS', 'Error generating cohort configuration:', error);
    throw error;
  }
}
