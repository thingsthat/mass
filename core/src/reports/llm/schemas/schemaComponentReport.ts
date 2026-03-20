import { z } from 'zod';

export type ReportComponent = {
  type: 'report';
};

export const componentLoadingReportZod = z
  .object({
    type: z.enum(['report']).describe('The type of component.'),
  })
  .describe('Component that displays a loading report.');

export const createComponentReport = (): ReportComponent => {
  return {
    type: 'report',
  };
};
