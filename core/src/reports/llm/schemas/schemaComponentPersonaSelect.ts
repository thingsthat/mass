import { z } from 'zod';

export type PersonaSelectComponent = {
  type: 'persona_select';
};

export const componentPersonaSelectZod = z
  .object({
    type: z.enum(['persona_select']).describe('The type of component.'),
  })
  .describe('Component that allows the user to select a persona from a list of personas.');

export const createComponentPersonaSelect = (): PersonaSelectComponent => {
  return {
    type: 'persona_select',
  };
};
