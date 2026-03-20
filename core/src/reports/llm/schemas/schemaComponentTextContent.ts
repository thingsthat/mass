import { z } from 'zod';

export const textContentZod = z.string().describe('Plain text content.');
