import { z } from 'zod';

export const schemaComponentFollowupZod = z
  .array(z.string().min(10).max(100))
  .min(1)
  .max(3)
  .describe(
    `Always ensure suggested follow-up questions are phrased exclusively as direct questions the user would ask (the system or persona), focusing on continuing the user's interaction. Never phrase them as questions the system or persona would ask the user. In persona chat contexts, these are questions the USER (human) would ask the PERSONA, not questions the persona would ask the user.`
  );
