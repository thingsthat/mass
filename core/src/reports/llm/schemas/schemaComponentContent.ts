import { z } from 'zod';

import { textContentZod } from 'core/src/reports/llm/schemas/schemaComponentTextContent';

export const schemaComponentContentZod = z
  .array(z.union([textContentZod]))
  .describe('The main content of the answer, an array of blocks of content objects if requested.');
