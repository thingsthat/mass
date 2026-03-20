import { createComponentReport } from 'core/src/reports/llm/schemas/schemaComponentReport';

import type { StructuredResponse } from 'core/src/workspace/conversation.types';

export const createComponentReportResponse = () => {
  const responseStructure: StructuredResponse = {
    content: [createComponentReport()],
  };

  return JSON.stringify(responseStructure);
};
