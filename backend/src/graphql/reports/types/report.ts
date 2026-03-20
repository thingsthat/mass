import { GraphQLJSON } from 'backend/src/graphql/types/common';
import { createTypeSafeObjectType } from 'backend/src/graphql/utils/typeSafeGraphQL';
import { GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';

import type { Report } from 'core/src/reports/reports.types';

/**
 * Type-safe GraphQL type for reports
 * Ensures all fields from Report type are present
 */
export const ReportType = createTypeSafeObjectType<Report>({
  name: 'Report',
  description: 'A report with data and metadata',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    workspace_id: { type: new GraphQLNonNull(GraphQLString) },
    report: { type: new GraphQLNonNull(GraphQLJSON) }, // JSON object
    created_at: { type: new GraphQLNonNull(GraphQLString) },
    updated_at: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

/**
 * GraphQL type for reports list
 */
export const ReportsType = new GraphQLObjectType({
  name: 'Reports',
  fields: () => ({
    reports: { type: new GraphQLList(ReportType) },
  }),
});
