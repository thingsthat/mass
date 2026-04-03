import { log } from 'core/src/helpers/logger';
import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';

import { ReportType } from 'backend/src/graphql/reports/types/report';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { ReportData } from 'core/src/reports/reports.types';

export type ReportsResponse = {
  reports: {
    reports: {
      id: string;
      workspace_id: string;
      report: ReportData;
      status: string;
      created_at?: string;
      updated_at?: string;
      description?: string;
    }[];
  };
};

export const GET_WORKSPACE_REPORTS = `
  query GetWorkspaceReports($workspaceId: String!) {
    reports(workspaceId: $workspaceId) {
      reports {
        id
        workspace_id
        report
        status
        created_at
        updated_at
      }
    }
  }
`;

export const GET_REPORT_BY_ID = `
  query GetReportById($reportId: String!) {
    reports(reportId: $reportId) {
      reports {
        id
        workspace_id
        report
        status
        created_at
        updated_at
      }
    }
  }
`;

export const ReportsResolver: GraphResolver = {
  type: new GraphQLObjectType({
    name: 'ReportsResponse',
    fields: () => ({
      reports: { type: new GraphQLList(ReportType) },
    }),
  }),
  args: {
    workspaceId: { type: GraphQLString },
    reportId: { type: GraphQLString },
  },
  resolve: async (
    _root: any,
    { workspaceId, reportId }: { workspaceId?: string; reportId?: string },
    context: Context
  ) => {
    const { db } = context;

    try {
      let query = db
        .from('reports')
        .select('id, workspace_id, report, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      if (reportId) {
        query = query.eq('id', reportId).limit(1);
      }

      const result = await query;
      const reports = result.data ?? [];
      const error = result.error;

      if (error) {
        throw new Error(`Failed to load reports: ${error.message}`);
      }

      return { reports: Array.isArray(reports) ? reports : [] };
    } catch (error) {
      log.error('GRAPHQL', 'Error in reports resolver:', error);
      throw error;
    }
  },
};
