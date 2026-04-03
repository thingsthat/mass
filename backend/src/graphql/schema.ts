import { GraphQLObjectType, GraphQLSchema } from 'graphql';

import { DeleteCohortResolver } from 'backend/src/graphql/personas/mutations/deleteCohort';
import { UpsertCohortResolver } from 'backend/src/graphql/personas/mutations/upsertCohort';
import { UpsertPersonaResolver } from 'backend/src/graphql/personas/mutations/upsertPersona';
import { CohortResolver } from 'backend/src/graphql/personas/queries/cohort';
import { CohortsPersonasResolver } from 'backend/src/graphql/personas/queries/cohortPersonas';
import { CohortsResolver } from 'backend/src/graphql/personas/queries/cohorts';
import { PersonaResolver } from 'backend/src/graphql/personas/queries/persona';
import { PersonasResolver } from 'backend/src/graphql/personas/queries/personas';
import { ReportsResolver } from 'backend/src/graphql/reports/queries/reports';
import { TaskResolver } from 'backend/src/graphql/tasks/queries/task';
import { TasksResolver } from 'backend/src/graphql/tasks/queries/tasks';
import { DeleteWorkspaceResolver } from 'backend/src/graphql/workspace/mutations/deleteWorkspace';
import { UpsertWorkspaceResolver } from 'backend/src/graphql/workspace/mutations/upsertWorkspace';
import { WorkspaceResolver } from 'backend/src/graphql/workspace/queries/workspace';
import { WorkspacesResolver } from 'backend/src/graphql/workspace/queries/workspaces';

/**
 * GraphQL schema for the API
 */

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    task: TaskResolver,
    tasks: TasksResolver,
    cohort: CohortResolver,
    cohort_personas: CohortsPersonasResolver,
    cohorts: CohortsResolver,
    persona: PersonaResolver,
    personas: PersonasResolver,
    reports: ReportsResolver,
    workspace: WorkspaceResolver,
    workspaces: WorkspacesResolver,
  }),
});

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    delete_cohort: DeleteCohortResolver,
    delete_workspace: DeleteWorkspaceResolver,
    upsert_cohort: UpsertCohortResolver,
    upsert_persona: UpsertPersonaResolver,
    upsert_workspace: UpsertWorkspaceResolver,
  }),
});

export const schema = new GraphQLSchema({
  mutation: MutationType,
  query: QueryType,
});
