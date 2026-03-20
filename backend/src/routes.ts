import graphqlHandler from 'backend/src/graphql/index';
import promptAskHandler from 'backend/src/prompt-ask/index';
import reportStartHandler from 'backend/src/report-start/index';

import type { Handler } from 'backend/src/types/server';

export const ROUTES: { path: string; handler: Handler }[] = [
  { path: '/graphql', handler: graphqlHandler },
  { path: '/prompt-ask', handler: promptAskHandler },
  { path: '/report-start', handler: reportStartHandler },
];
