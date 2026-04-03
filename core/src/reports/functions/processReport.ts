import { v4 as uuidv4 } from 'uuid';

import { getDatabaseClient } from 'core/src/database/client';
import { log } from 'core/src/helpers/logger';
import { getRandomSubset } from 'core/src/helpers/random';
import { resolveFilePathsToBase64 } from 'core/src/helpers/resolveFilePath';
import { generateDebateReport } from 'core/src/reports/llm/controllers/report-type-debate/reportDebateLLM';
import {
  getPersonaResponseForReport,
  generateFeedbackReport,
} from 'core/src/reports/llm/controllers/report-type-feedback/reportFeedbackLLM';
import { getPersonaIdeasResponse } from 'core/src/reports/llm/controllers/report-type-ideas/ideasResponseLLM';
import { generateIdeasReport } from 'core/src/reports/llm/controllers/report-type-ideas/reportIdeasLLM';
import { extractQuestionnaireFromPrompt } from 'core/src/reports/llm/controllers/report-type-questionnaire/questionnaireExtractionLLM';
import { getPersonaQuestionnaireResponse } from 'core/src/reports/llm/controllers/report-type-questionnaire/questionnaireResponseLLM';
import { generateQuestionnaireReport } from 'core/src/reports/llm/controllers/report-type-questionnaire/reportQuestionnaireLLM';
import { generateUnifiedReport } from 'core/src/reports/llm/controllers/report-unified/reportUnifiedLLM';
import { createComponentReportResponse } from 'core/src/reports/llm/schemas/schemaHelpers';
import {
  createTask,
  findOrCreateTask,
  markTaskAsCompleted,
  markTaskAsFailed,
  markTaskAsRunning,
  updateTaskProgress,
} from 'core/src/tasks/tasksController';
import { expandPersonaIds } from 'core/src/workspace/expandPersonaIds';
import { Workspace } from 'core/src/workspace/workspace.types';

import type { IdeasPersonaResponse } from 'core/src/reports/llm/controllers/report-type-ideas/schemaIdeasResponse';
import type { QuestionnairePersonaResponse } from 'core/src/reports/llm/controllers/report-type-questionnaire/questionnaireResponseLLM';
import type {
  ReportGenerateRequest,
  ReportPersonaResponse,
} from 'core/src/reports/reportResponses.types';
import type { ReportData, ReportResult, ReportType } from 'core/src/reports/reports.types';
import type {
  Conversation,
  ConversationStatus,
  MessageFile,
} from 'core/src/workspace/conversation.types';

type ReportRequestFile = {
  url?: string;
  data?: string;
  path?: string;
  mimeType?: string;
  name?: string;
};
type ResolvedReportFile = { data: string; mimeType: string; name?: string };

async function resolveReportFilesToBase64(
  files: ReportRequestFile[] | undefined
): Promise<ResolvedReportFile[] | undefined> {
  if (!files?.length) {
    return undefined;
  }
  const resolved: ResolvedReportFile[] = [];
  const pathsToResolve: string[] = [];
  for (const file of files) {
    if (file.data) {
      resolved.push({
        data: file.data,
        mimeType: file.mimeType ?? 'application/octet-stream',
        name: file.name,
      });
    } else if (file.path) {
      pathsToResolve.push(file.path);
    }
  }
  if (pathsToResolve.length > 0) {
    const fromPaths = await resolveFilePathsToBase64(pathsToResolve);
    resolved.push(...fromPaths);
  }
  return resolved.length ? resolved : undefined;
}

function mapRequestFilesToMessageFiles(
  files: ReportRequestFile[] | undefined
): MessageFile[] | undefined {
  if (!files?.length) {
    return undefined;
  }
  const result: MessageFile[] = [];
  for (const file of files) {
    if (file.url) {
      result.push({ url: file.url, mimeType: file.mimeType, name: file.name });
    } else if (file.data) {
      result.push({ data: file.data, mimeType: file.mimeType, name: file.name });
    }
  }
  return result.length ? result : undefined;
}

// Process personas in batches with concurrency limit
const CONCURRENCY_LIMIT = 10;
const DEFAULT_MAX_PERSONAS = 10;
const LOG_TAG_PROCESS_REPORT = 'REPORTS';

function sendTestingLoadingComponent() {
  const componentResponse = createComponentReportResponse();
  const choicesFormat = JSON.stringify({
    choices: [
      {
        delta: {
          content: componentResponse,
        },
      },
    ],
  });

  return new Response(`data: ${choicesFormat}\n\ndata: [DONE]\n\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

const fetchPersonas = async (persona_ids: string[], maxPersonas?: number) => {
  const db = getDatabaseClient();
  const limit = maxPersonas || persona_ids.length;

  const { data: personas, error: personasError } = await db
    .from('personas')
    .select('*')
    .limit(limit)
    .in('id', persona_ids);

  if (personasError) {
    throw new Error(`Failed to fetch personas: ${personasError.message}`);
  }

  if (!personas || personas.length === 0) {
    throw new Error('No personas found with provided IDs');
  }

  return personas;
};

const fetchRandomPersonas = async (maxPersonas: number = DEFAULT_MAX_PERSONAS) => {
  const db = getDatabaseClient();
  const fetchAmount = Math.min(maxPersonas * 3, 100);

  const { data: personas, error: personasError } = await db
    .from('personas')
    .select('*')
    .limit(fetchAmount);

  if (personasError) {
    throw new Error(`Failed to fetch random personas: ${personasError.message}`);
  }

  if (!personas || personas.length === 0) {
    throw new Error('No random personas found');
  }

  // Randomize the personas array and select the final set
  // Use the existing random utility to select final subset
  const finalPersonas = getRandomSubset(personas, maxPersonas);

  return finalPersonas;
};

const updateReport = async (
  reportId: string,
  report: Partial<ReportData>,
  status: 'completed' | 'failed' | 'loading',
  currentReport?: any
) => {
  const db = getDatabaseClient();

  if (!reportId || reportId === 'undefined' || reportId === 'null') {
    const errorMsg = `[updateReport] ERROR: Invalid reportId: ${reportId} (type: ${typeof reportId})`;
    log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
      reportId,
      reportIdType: typeof reportId,
      stack: new Error().stack,
    });
    throw new Error(errorMsg);
  }

  // Use provided currentReport or fetch it
  let reportData = currentReport;
  if (!reportData) {
    const { data: fetchedReport, error: fetchError } = await db
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError) {
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, '[updateReport] Error fetching report:', {
        reportId,
        error: fetchError.message,
        errorDetails: fetchError,
      });
      throw new Error(`Failed to fetch report: ${fetchError.message}`);
    }

    reportData = fetchedReport;

    // Validate that fetched report ID matches the reportId parameter
    if (reportData?.id !== reportId) {
      const errorMsg = `[updateReport] ERROR: Report ID mismatch! Expected reportId: ${reportId}, but fetched report has id: ${reportData?.id}`;
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
        expectedReportId: reportId,
        fetchedReportId: reportData?.id,
        stack: new Error().stack,
      });
      throw new Error(errorMsg);
    }
  } else {
    // Validate that currentReport ID matches the reportId parameter
    if (reportData?.id !== reportId) {
      const errorMsg = `[updateReport] ERROR: Report ID mismatch! Expected reportId: ${reportId}, but currentReport has id: ${reportData?.id}`;
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
        expectedReportId: reportId,
        currentReportId: reportData?.id,
        stack: new Error().stack,
      });
      throw new Error(errorMsg);
    }
  }

  const processingTime = reportData?.report?.started_at
    ? Date.now() - reportData.report.started_at
    : 0;

  const { data: updatedReport, error: updateError } = await db
    .from('reports')
    .update({
      status,
      report: {
        ...reportData?.report,
        ...report,
        processing_time: processingTime,
      },
    })
    .eq('id', reportId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update report: ${updateError.message}`);
  }

  // Validate that updated report ID matches the reportId parameter
  if (updatedReport?.id !== reportId) {
    const errorMsg = `[updateReport] ERROR: Updated report ID mismatch! Expected reportId: ${reportId}, but updated report has id: ${updatedReport?.id}`;
    log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
      expectedReportId: reportId,
      updatedReportId: updatedReport?.id,
      stack: new Error().stack,
    });
    throw new Error(errorMsg);
  }

  return updatedReport;
};

const generateFeedbackReportResponses = async (
  personas: any[],
  prompt: string,
  workspace_id: string,
  reportId: string,
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<ReportPersonaResponse[]> => {
  const db = getDatabaseClient();

  const personaResponses: ReportPersonaResponse[] = [];

  // Use an object to track progress atomically
  const progressTracker = { completed: 0 };

  const keywords: string[] = [];

  // Helper function to safely update progress
  const updateProgress = async () => {
    progressTracker.completed++;
    try {
      await updateReport(
        reportId,
        {
          responses_complete: progressTracker.completed,
          keywords,
        },
        'loading'
      );
    } catch (updateError) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        'Failed to update report progress:',
        updateError
      );
      // Don't throw here, continue processing
    }
  };

  // Helper function to process a single persona
  const processPersona = async (persona: any): Promise<ReportPersonaResponse | null> => {
    try {
      const response = await getPersonaResponseForReport(persona, prompt, files);

      keywords.push(...response.keywords);

      const { error: insertError } = await db
        .from('report_responses')
        .insert({
          workspace_id,
          response,
          persona_id: persona.id,
        })
        .select('*')
        .single()
        .then(r => r);
      if (insertError) {
        log.error(
          'REPORTS',
          LOG_TAG_PROCESS_REPORT,
          '[generateFeedbackReportResponses] Failed to insert report response:',
          {
            reportId,
            personaId: persona.id,
            error: insertError.message,
          }
        );
      }

      // Update progress in real-time as each response completes
      await updateProgress();

      return response;
    } catch (error) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        `Failed to get response from persona ${persona.id}:`,
        error
      );

      // Still update progress for failed requests
      await updateProgress();

      return null; // Return null for failed requests
    }
  };

  // Process personas in batches
  for (let i = 0; i < personas.length; i += CONCURRENCY_LIMIT) {
    const batch = personas.slice(i, i + CONCURRENCY_LIMIT);

    // Process current batch concurrently
    const batchPromises = batch.map(processPersona);
    const batchResults = await Promise.allSettled(batchPromises);

    // Extract successful responses from this batch
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        personaResponses.push(result.value);
      }
    }
  }

  if (personaResponses.length === 0) {
    throw new Error('Failed to get any persona responses');
  }

  return personaResponses;
};

const generateQuestionnaireReportResponses = async (
  personas: any[],
  questionnaire: { questions: any[] },
  workspace_id: string,
  reportId: string,
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<QuestionnairePersonaResponse[]> => {
  const db = getDatabaseClient();

  const personaResponses: QuestionnairePersonaResponse[] = [];

  // Use an object to track progress atomically
  const progressTracker = { completed: 0 };

  // Helper function to safely update progress
  const updateProgress = async () => {
    progressTracker.completed++;
    try {
      await updateReport(
        reportId,
        {
          responses_complete: progressTracker.completed,
        },
        'loading'
      );
    } catch (updateError) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        '[generateQuestionnaireReportResponses] Failed to update report progress:',
        {
          reportId,
          error: updateError,
        }
      );
      // Don't throw here, continue processing
    }
  };

  // Helper function to process a single persona
  const processPersona = async (persona: any): Promise<QuestionnairePersonaResponse | null> => {
    try {
      const response = await getPersonaQuestionnaireResponse(persona, questionnaire, files);

      // Store response in database (serialize as JSON)
      await db.from('report_responses').insert({
        workspace_id,
        response: JSON.stringify(response),
        persona_id: persona.id,
      });

      // Update progress in real-time as each response completes
      await updateProgress();

      return response;
    } catch (error) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        `Failed to get questionnaire response from persona ${persona.id}:`,
        error
      );

      // Still update progress for failed requests
      await updateProgress();

      return null; // Return null for failed requests
    }
  };

  // Process personas in batches
  for (let i = 0; i < personas.length; i += CONCURRENCY_LIMIT) {
    const batch = personas.slice(i, i + CONCURRENCY_LIMIT);

    // Process current batch concurrently
    const batchPromises = batch.map(processPersona);
    const batchResults = await Promise.allSettled(batchPromises);

    // Extract successful responses from this batch
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        personaResponses.push(result.value);
      }
    }
  }

  if (personaResponses.length === 0) {
    throw new Error('Failed to get any questionnaire responses');
  }

  return personaResponses;
};

const generateIdeasReportResponses = async (
  personas: any[],
  prompt: string,
  workspace_id: string,
  reportId: string,
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<Array<{ response: IdeasPersonaResponse; persona_id: string; persona: any }>> => {
  const personaResponses: Array<{
    response: IdeasPersonaResponse;
    persona_id: string;
    persona: any;
  }> = [];

  // Use an object to track progress atomically
  const progressTracker = { completed: 0 };

  // Helper function to safely update progress
  const updateProgress = async () => {
    progressTracker.completed++;
    try {
      await updateReport(
        reportId,
        {
          responses_complete: progressTracker.completed,
        },
        'loading'
      );
    } catch (updateError) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        '[generateIdeasReportResponses] Failed to update report progress:',
        {
          reportId,
          error: updateError,
        }
      );
      // Don't throw here, continue processing
    }
  };

  const db = getDatabaseClient();

  // Helper function to process a single persona
  const processPersona = async (
    persona: any
  ): Promise<{ response: IdeasPersonaResponse; persona_id: string } | null> => {
    try {
      const response = await getPersonaIdeasResponse(persona, prompt, files);

      // Store response in database (serialize as JSON)
      await db.from('report_responses').insert({
        workspace_id,
        response: JSON.stringify(response),
        persona_id: persona.id,
      });

      // Update progress in real-time as each response completes
      await updateProgress();

      return { response, persona_id: persona.id };
    } catch (error) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        `Failed to get ideas response from persona ${persona.id}:`,
        error
      );

      // Still update progress for failed requests
      await updateProgress();

      return null; // Return null for failed requests
    }
  };

  // Process personas in batches
  for (let i = 0; i < personas.length; i += CONCURRENCY_LIMIT) {
    const batch = personas.slice(i, i + CONCURRENCY_LIMIT);

    // Process current batch concurrently
    const batchPromises = batch.map(processPersona);
    const batchResults = await Promise.allSettled(batchPromises);

    // Extract successful responses from this batch
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        const value = result.value;
        const persona = personas.find(p => p.id === value.persona_id);
        if (persona) {
          personaResponses.push({
            response: value.response,
            persona_id: value.persona_id,
            persona,
          });
        }
      }
    }
  }

  if (personaResponses.length === 0) {
    throw new Error('Failed to get any ideas responses');
  }

  return personaResponses;
};

const getWorkspace = async (workspace_id: string) => {
  const db = getDatabaseClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('conversation')
    .eq('id', workspace_id)
    .single();
  return workspace as Workspace | null;
};

const updateWorkspace = async (workspace_id: string, workspace: Partial<Workspace>) => {
  const db = getDatabaseClient();
  const updateData: Partial<Workspace> = {
    ...workspace,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from('workspaces')
    .update(updateData as Record<string, unknown>)
    .eq('id', workspace_id)
    .select('*')
    .single();

  if (error) {
    log.error('REPORTS', LOG_TAG_PROCESS_REPORT, 'Failed to update workspace conversation:', error);
    throw new Error(`Failed to update workspace conversation: ${error.message}`);
  }

  return data;
};

const createInitialReport = async (
  workspace_id: string,
  prompt: string,
  reportType: string,
  reportTypes?: ReportType[]
) => {
  const db = getDatabaseClient();
  const { data: savedReport, error: saveError } = await db
    .from('reports')
    .insert({
      workspace_id,
      status: 'loading',
      report: {
        prompt,
        type: reportTypes && reportTypes.length > 0 ? reportTypes.join(',') : reportType,
        started_at: Date.now(),
        processing_time: 0,
      },
    })
    .select('*')
    .single();

  if (saveError) {
    throw new Error(`Failed to save report: ${saveError.message}`);
  }

  return savedReport;
};

// This returns the effective maximum number of personas determined by what was requested and what is available
const getEffectiveMaxPersonas = (availablePersonas: number, requestedPersonas?: number) => {
  if (requestedPersonas && requestedPersonas > 0) {
    if (requestedPersonas > availablePersonas) {
      return availablePersonas;
    }
    return requestedPersonas;
  }

  if (DEFAULT_MAX_PERSONAS > availablePersonas) {
    return availablePersonas;
  }
  return DEFAULT_MAX_PERSONAS;
};

/**
 * Process persona feedback and generate report
 * This function handles the complete report generation flow
 */
const processPersonaReport = async (
  prompt: string,
  persona_ids: string[],
  workspace_id: string,
  cohort_ids: string[],
  reportId: string,
  initialReport: any,
  max_personas?: number,
  reportType: ReportType = 'feedback',
  reportTypes?: ReportType[],
  files?: ReportRequestFile[],
  taskId?: string,
  debateOptions?: { max_rounds?: number; duration_minutes?: number }
): Promise<{ report: ReportResult; savedReport: ReportData }> => {
  const db = getDatabaseClient();

  const resolvedFiles = await resolveReportFilesToBase64(files);

  if (!reportId || reportId === 'undefined' || reportId === 'null') {
    const errorMsg = `[processPersonaReport] ERROR: Invalid reportId: ${reportId} (type: ${typeof reportId})`;
    log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
      reportId,
      reportIdType: typeof reportId,
      stack: new Error().stack,
    });
    throw new Error(errorMsg);
  }

  // Validate that initialReport ID matches reportId if provided
  if (initialReport && initialReport.id !== reportId) {
    const errorMsg = `[processPersonaReport] ERROR: Report ID mismatch! Expected reportId: ${reportId}, but initialReport has id: ${initialReport.id}`;
    log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
      expectedReportId: reportId,
      initialReportId: initialReport.id,
      stack: new Error().stack,
    });
    throw new Error(errorMsg);
  }

  const { allPersonaIds, maxPersonasFromCohorts, useRandomPersonas } = await expandPersonaIds(
    db,
    persona_ids,
    cohort_ids
  );

  let personas;
  if (useRandomPersonas) {
    const effectiveMaxPersonas = max_personas || DEFAULT_MAX_PERSONAS;
    personas = await fetchRandomPersonas(effectiveMaxPersonas);
  } else {
    const effectiveMaxPersonas = getEffectiveMaxPersonas(maxPersonasFromCohorts, max_personas);
    personas = await fetchPersonas(allPersonaIds, effectiveMaxPersonas);
  }

  await updateReport(
    reportId,
    {
      responses_total: personas.length,
    },
    'loading',
    initialReport
  );

  // Update background task progress if taskId is provided
  if (taskId) {
    try {
      await updateTaskProgress(db, taskId, {
        stage: 'fetching_personas',
        personas_count: personas.length,
      });
    } catch (updateError) {
      log.error(
        'REPORTS',
        LOG_TAG_PROCESS_REPORT,
        '[processPersonaReport] Error updating task progress:',
        updateError
      );
      // Don't fail the whole operation if progress update fails
    }
  }

  // Determine which report types to generate
  const typesToGenerate = reportTypes && reportTypes.length > 0 ? reportTypes : [reportType];

  let personaResponses: ReportPersonaResponse[] | null = null;
  let debateHistory: any[] = [];
  let debatePersonas: any[] = [];
  let questionnaire: { questions: any[] } | null = null;
  let questionnaireResponses: QuestionnairePersonaResponse[] | null = null;
  let ideasResponses: Array<{
    response: IdeasPersonaResponse;
    persona_id: string;
    persona: any;
  }> | null = null;

  // Extract questionnaire structure if questionnaire type is requested
  if (typesToGenerate.includes('questionnaire')) {
    questionnaire = await extractQuestionnaireFromPrompt(prompt);
  }

  // If multiple report types are requested, use unified generation
  if (typesToGenerate.length > 1) {
    // Generate persona responses for feedback analysis
    if (typesToGenerate.includes('feedback')) {
      personaResponses = await generateFeedbackReportResponses(
        personas,
        prompt,
        workspace_id,
        reportId,
        resolvedFiles
      );
    }

    // Generate debate for debate analysis (but only get the raw debate history)
    if (typesToGenerate.includes('debate')) {
      if (taskId) {
        try {
          await updateTaskProgress(db, taskId, { stage: 'generating_debate' });
        } catch (updateError) {
          log.error(
            'REPORTS',
            LOG_TAG_PROCESS_REPORT,
            '[processPersonaReport] Error updating task progress (generating_debate):',
            updateError
          );
        }
      }
      const debateReportOptions = debateOptions
        ? {
            maxRounds: debateOptions.max_rounds,
            durationMinutes: debateOptions.duration_minutes,
          }
        : undefined;
      // We only need the debate history, not the generated report
      const { debateHistory: history } = await generateDebateReport(
        prompt,
        personas,
        resolvedFiles,
        debateReportOptions
      );
      debateHistory = history;

      // Convert personas to the format expected by unified report
      debatePersonas = personas.map(persona => ({
        id: persona.id,
        value: {
          name: persona.details.name,
          age: persona.details.age,
          occupation: persona.details.occupation,
          text: persona.details.name, // Use name as representative text for now
        },
      }));

      // Store debate messages in database
      for (const debateMessage of debateHistory) {
        await db.from('report_responses').insert({
          workspace_id,
          response: debateMessage.text,
          persona_id: debateMessage.author_id,
        });
      }
    }

    // Generate questionnaire responses for questionnaire analysis
    if (typesToGenerate.includes('questionnaire') && questionnaire) {
      questionnaireResponses = await generateQuestionnaireReportResponses(
        personas,
        questionnaire,
        workspace_id,
        reportId,
        resolvedFiles
      );
    }

    // Generate ideas responses for ideas analysis
    if (typesToGenerate.includes('ideas')) {
      ideasResponses = await generateIdeasReportResponses(
        personas,
        prompt,
        workspace_id,
        reportId,
        resolvedFiles
      );
    }

    // Convert ideas responses to IdeaItem format if available
    let allIdeas: any[] = [];
    if (ideasResponses && ideasResponses.length > 0) {
      for (const ideasResponseData of ideasResponses) {
        const persona = ideasResponseData.persona;
        for (const idea of ideasResponseData.response.ideas) {
          allIdeas.push({
            id: uuidv4(),
            idea: idea.idea,
            persona_id: persona.id,
            persona_name: persona.details.name,
            persona_age: persona.details.age,
            persona_occupation: persona.details.metadata.job_title || '',
            reasoning: idea.reasoning,
            appeal_score: idea.appeal_score,
          });
        }
      }
    }

    // Generate unified report using LLM with RAW data (not pre-processed reports)
    const unifiedReport = await generateUnifiedReport(
      prompt,
      typesToGenerate,
      personaResponses || undefined,
      debateHistory.length > 0 ? debateHistory : undefined,
      debatePersonas.length > 0 ? debatePersonas : undefined,
      questionnaire || undefined,
      questionnaireResponses || undefined,
      allIdeas.length > 0 ? allIdeas : undefined
    );

    // Update the report with completed status

    const savedReport = await updateReport(
      reportId,
      {
        prompt,
        type: typesToGenerate.join(','),
        report: unifiedReport,
        persona_responses: personaResponses,
      },
      'completed'
    );

    // Validate that saved report ID matches reportId
    if (savedReport?.id !== reportId) {
      const errorMsg = `[processPersonaReport] ERROR: Saved report ID mismatch! Expected reportId: ${reportId}, but saved report has id: ${savedReport?.id}`;
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
        expectedReportId: reportId,
        savedReportId: savedReport?.id,
        stack: new Error().stack,
      });
      throw new Error(errorMsg);
    }

    return { report: unifiedReport, savedReport: savedReport as ReportData };
  }

  if (typesToGenerate.includes('questionnaire')) {
    if (!questionnaire) {
      throw new Error('Questionnaire structure not extracted');
    }

    // Generate questionnaire responses from personas
    questionnaireResponses = await generateQuestionnaireReportResponses(
      personas,
      questionnaire,
      workspace_id,
      reportId,
      resolvedFiles
    );
    const report = await generateQuestionnaireReport(prompt, questionnaire, questionnaireResponses);

    // Update the report with completed status
    const savedReport = await updateReport(
      reportId,
      {
        prompt,
        type: reportType,
        report: report,
      },
      'completed'
    );

    // Validate that saved report ID matches reportId
    if (savedReport?.id !== reportId) {
      const errorMsg = `[processPersonaReport] ERROR: Saved report ID mismatch! Expected reportId: ${reportId}, but saved report has id: ${savedReport?.id}`;
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
        expectedReportId: reportId,
        savedReportId: savedReport?.id,
        stack: new Error().stack,
      });
      throw new Error(errorMsg);
    }

    return { report, savedReport: savedReport as ReportData };
  }

  if (typesToGenerate.includes('debate')) {
    if (taskId) {
      try {
        await updateTaskProgress(db, taskId, { stage: 'generating_debate' });
      } catch (updateError) {
        log.error(
          'REPORTS',
          LOG_TAG_PROCESS_REPORT,
          '[processPersonaReport] Error updating task progress (generating_debate):',
          updateError
        );
      }
    }
    const debateReportOptions = debateOptions
      ? {
          maxRounds: debateOptions.max_rounds,
          durationMinutes: debateOptions.duration_minutes,
        }
      : undefined;
    const { report: debate, debateHistory: history } = await generateDebateReport(
      prompt,
      personas,
      resolvedFiles,
      debateReportOptions
    );

    // Store debate messages in database
    for (const debateMessage of history) {
      await db
        .from('report_responses')
        .insert({
          workspace_id,
          response: debateMessage.text,
          persona_id: debateMessage.author_id,
        })
        .select('*')
        .single()
        .then(r => r);
    }

    // Update the report with completed status
    const savedReport = await updateReport(
      reportId,
      {
        prompt,
        type: reportType,
        report: debate,
      },
      'completed'
    );

    return { report: debate, savedReport: savedReport as ReportData };
  }

  if (typesToGenerate.includes('feedback')) {
    // For feedback reports, generate individual persona responses first
    personaResponses = await generateFeedbackReportResponses(
      personas,
      prompt,
      workspace_id,
      reportId,
      resolvedFiles
    );

    const report = await generateFeedbackReport(prompt, personaResponses);

    // Update the report with completed status
    const savedReport = await updateReport(
      reportId,
      {
        prompt,
        type: reportType,
        report: report,
      },
      'completed'
    );

    // Validate that saved report ID matches reportId
    if (savedReport?.id !== reportId) {
      const errorMsg = `[processPersonaReport] ERROR: Saved report ID mismatch! Expected reportId: ${reportId}, but saved report has id: ${savedReport?.id}`;
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
        expectedReportId: reportId,
        savedReportId: savedReport?.id,
        stack: new Error().stack,
      });
      throw new Error(errorMsg);
    }

    return { report, savedReport: savedReport as ReportData };
  }

  if (typesToGenerate.includes('ideas')) {
    // Generate ideas responses from personas
    ideasResponses = await generateIdeasReportResponses(
      personas,
      prompt,
      workspace_id,
      reportId,
      resolvedFiles
    );

    // Convert ideas responses to IdeaItem format
    const allIdeas: any[] = [];
    for (const ideasResponseData of ideasResponses) {
      const persona = ideasResponseData.persona;
      for (const idea of ideasResponseData.response.ideas) {
        allIdeas.push({
          id: uuidv4(),
          idea: idea.idea,
          persona_id: persona.id,
          persona_name: persona.details.name,
          persona_age: persona.details.age,
          persona_occupation: persona.details.metadata.job_title || '',
          reasoning: idea.reasoning,
          appeal_score: idea.appeal_score,
        });
      }
    }

    const report = await generateIdeasReport(prompt, allIdeas);

    // Update the report with completed status
    const savedReport = await updateReport(
      reportId,
      {
        prompt,
        type: reportType,
        report: report,
      },
      'completed'
    );

    // Validate that saved report ID matches reportId
    if (savedReport?.id !== reportId) {
      const errorMsg = `[processPersonaReport] ERROR: Saved report ID mismatch! Expected reportId: ${reportId}, but saved report has id: ${savedReport?.id}`;
      log.error('REPORTS', LOG_TAG_PROCESS_REPORT, errorMsg, {
        expectedReportId: reportId,
        savedReportId: savedReport?.id,
        stack: new Error().stack,
      });
      throw new Error(errorMsg);
    }

    return { report, savedReport: savedReport as ReportData };
  }

  throw new Error('No valid report types specified');
};

/**
 * Send report ready notification to user (email)
 */
const sendReportNotification = async (_prompt: string, _report: any) => {
  try {
    // Notification disabled: auth removed
  } catch (notificationError) {
    log.error(
      'REPORTS',
      LOG_TAG_PROCESS_REPORT,
      'Error sending report ready notification:',
      notificationError
    );
  }
};

/**
 * Update workspace conversation status to indicate report completion
 * Workflow state updates are handled in prompt-report-background
 */
const updateWorkspaceStatus = async (
  workspace_id: string,
  status: ConversationStatus,
  _report_id?: string
) => {
  const workspace = await getWorkspace(workspace_id);

  if (!workspace?.conversation) {
    log.error('REPORTS', LOG_TAG_PROCESS_REPORT, 'Workspace conversation not found');
    return;
  }

  const conv: Partial<Conversation> =
    (workspace as { conversation?: Partial<Conversation> }).conversation ?? {};
  const updatedConversation: Conversation = {
    name: conv.name ?? '',
    messages: conv.messages ?? [],
    ...conv,
    status: status,
  };

  await updateWorkspace(workspace_id, {
    conversation: updatedConversation,
  });
};

const updateWorkspaceTitleDescription = async (workspace_id: string, report: ReportResult) => {
  const workspace = await getWorkspace(workspace_id);
  const ws = workspace as { name?: string; description?: string } | null;
  if (!ws?.name || ws.name.length === 0 || ws.name === 'New Workspace') {
    await updateWorkspace(workspace_id, {
      name: report.title,
    });
  }

  if (!ws?.description || ws.description.length === 0) {
    await updateWorkspace(workspace_id, {
      description: report.summary,
    });
  }
};

const insertReportFailed = async (workspace_id: string, error: string) => {
  const db = getDatabaseClient();
  return db.from('reports').insert({
    workspace_id,
    status: 'failed',
    report: {
      error,
    },
  });
};

const getReportById = async (report_id: string) => {
  const db = getDatabaseClient();

  if (!report_id || report_id === 'undefined' || report_id === 'null') {
    const errorMsg = `Report ERROR: Invalid report_id: ${report_id} (type: ${typeof report_id})`;
    log.error('REPORTS', '[processReport] [getReportById]', errorMsg, {
      report_id,
      reportIdType: typeof report_id,
      stack: new Error().stack,
    });
    throw new Error(errorMsg);
  }

  const { data: report, error: fetchError } = await db
    .from('reports')
    .select('*')
    .eq('id', report_id)
    .single();

  if (fetchError) {
    log.error('REPORTS', 'processReport getReportById', 'Error fetching report:', {
      report_id,
      error: fetchError.message,
      errorDetails: fetchError,
      errorCode: fetchError.code,
    });
    throw new Error(`Failed to fetch report: ${fetchError.message}`);
  }

  return report;
};

// This component doesn't return a response, it's a background function, so it doesn't return a response
export const processsReport = async (
  requestData: ReportGenerateRequest,
  _request?: Request
): Promise<Response> => {
  const {
    prompt,
    persona_ids = [],
    workspace_id,
    cohort_ids,
    max_personas = DEFAULT_MAX_PERSONAS,
    report_type = 'feedback',
    report_types,
    report_id,
    files: requestFiles,
    file_paths,
    debate_options,
  } = requestData;

  const files = [
    ...(requestFiles ?? []),
    ...(file_paths ?? []).map(p => ({ path: p })),
  ] as ReportRequestFile[];
  const filesToUse = files.length > 0 ? files : undefined;

  const db = getDatabaseClient();
  let taskId: string | undefined;

  if (!report_id || report_id === 'undefined' || report_id === 'null') {
    const errorMsg = `[processsReport] ERROR: Invalid report_id: ${report_id} (type: ${typeof report_id})`;
    log.error('REPORTS', '[processReport] [processsReport]', errorMsg, {
      requestData,
      stack: new Error().stack,
    });
    throw new Error(errorMsg);
  }

  try {
    const initialReport = await getReportById(report_id);

    const task = await findOrCreateTask(db, {
      workspace_id: workspace_id,
      task_type: 'report',
      metadata: {
        report_id: report_id,
        prompt: prompt,
        report_type: report_type,
        report_types: report_types,
      },
      existingTaskFilters: {
        workspaceId: workspace_id,
        taskType: 'report',
        status: 'pending',
      },
    });
    taskId = task.id;

    await markTaskAsRunning(db, taskId);

    const { report, savedReport: savedReport2 } = await processPersonaReport(
      prompt,
      persona_ids,
      workspace_id,
      cohort_ids,
      report_id,
      initialReport,
      max_personas,
      report_type,
      report_types,
      filesToUse,
      taskId,
      debate_options
    );

    // Send notification email
    await sendReportNotification(prompt, report);

    // Update workspace status to indicate report completion
    await updateWorkspaceStatus(workspace_id, '4_step_report', savedReport2.id);
    await updateWorkspaceTitleDescription(workspace_id, report);

    // Mark background task as completed
    if (taskId) {
      await markTaskAsCompleted(db, taskId, {
        report_id: savedReport2.id,
        success: true,
      });
    }

    // For cohort-based requests, return streaming component
    if (cohort_ids && cohort_ids.length > 0) {
      return sendTestingLoadingComponent();
    }

    // For direct persona_ids, return the full response
    return new Response(
      JSON.stringify({
        success: true,
        report_id: savedReport2.id,
        report,
        task_id: taskId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error(
      'REPORTS',
      '[processReport] [processsReport] [processPersonaReport]',
      'Error processing personas:',
      {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        report_id,
        reportIdType: typeof report_id,
        workspace_id,
        taskId,
        errorDetails: error,
      }
    );

    // Mark background task as failed
    if (taskId) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process personas';
      await markTaskAsFailed(db, taskId, errorMessage);
    }

    // Update workspace status to indicate failure
    try {
      await updateWorkspaceStatus(workspace_id, '1_step_ask');
    } catch (workspaceError) {
      log.error(
        'REPORTS',
        '[processReport] [processsReport] [processPersonaReport]',
        'Failed to reset workspace status:',
        workspaceError
      );
    }

    await insertReportFailed(
      workspace_id,
      error instanceof Error ? error.message : 'Failed to process personas'
    );

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process personas',
        task_id: taskId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Creates only the report row and task; returns report_id. Does not update workspace conversation.
 * Use this when the client manages conversation messages (e.g. workspace inline report flow).
 */
export async function startReportGeneration(
  requestData: ReportGenerateRequest
): Promise<{ report_id: string }> {
  const db = getDatabaseClient();
  const { prompt, workspace_id, report_type = 'feedback', report_types } = requestData;

  if (!workspace_id) {
    throw new Error('workspace_id is required');
  }

  const savedReport = await createInitialReport(workspace_id, prompt, report_type, report_types);
  const report_id = (savedReport as { id: string }).id;

  await createTask(db, {
    workspace_id: workspace_id,
    task_type: 'report',
    metadata: {
      report_id: report_id,
      prompt: prompt,
      report_type: report_type,
      report_types: report_types,
    },
  });

  return { report_id };
}

/**
 * In-process initial report steps. Returns report_id for CLI or other callers that do not need a Response.
 */
export async function createReportInitialSteps(
  requestData: ReportGenerateRequest
): Promise<{ report_id: string }> {
  const db = getDatabaseClient();
  const {
    prompt,
    workspace_id,
    cohort_ids,
    report_type = 'feedback',
    report_types,
    files: requestFiles,
    file_paths,
  } = requestData;

  const files = [
    ...(requestFiles ?? []),
    ...(file_paths ?? []).map(p => ({ path: p })),
  ] as ReportRequestFile[];
  const filesForMessage = files.length > 0 ? files : undefined;

  if (!workspace_id) {
    throw new Error('workspace_id is required');
  }

  const workspace = await getWorkspace(workspace_id);
  if (!workspace?.conversation) {
    throw new Error('Workspace conversation not found');
  }

  const workspaceConv: Partial<Conversation> =
    (workspace as { conversation?: Partial<Conversation> }).conversation ?? {};
  const updatedConversation: Conversation = {
    name: workspaceConv.name ?? '',
    ...workspaceConv,
    messages: [
      {
        id: uuidv4(),
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
        files: mapRequestFilesToMessageFiles(filesForMessage),
      },
      {
        id: uuidv4(),
        role: 'assistant',
        content: JSON.stringify({
          content: [{ type: 'report' }],
        }),
        timestamp: new Date().toISOString(),
      },
    ],
    status: '3_step_loading_report',
    cohort_ids: cohort_ids,
  };

  await updateWorkspace(workspace_id, {
    conversation: updatedConversation,
  });

  const savedReport = await createInitialReport(workspace_id, prompt, report_type, report_types);
  const report_id = (savedReport as { id: string }).id;

  await createTask(db, {
    workspace_id: workspace_id,
    task_type: 'report',
    metadata: {
      report_id: report_id,
      prompt: prompt,
      report_type: report_type,
      report_types: report_types,
    },
  });

  return { report_id };
}

/**
 * Run report in-process and return data. For CLI; no Response, no workflow step.
 */
export async function runReportForCli(
  requestData: ReportGenerateRequest
): Promise<{ reportId: string; reportData: ReportData }> {
  const { report_id } = await createReportInitialSteps(requestData);
  const fullRequest: ReportGenerateRequest = { ...requestData, report_id };
  const response = await processsReport(fullRequest);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg = (body as { error?: string })?.error ?? response.statusText;
    throw new Error(msg);
  }
  const db = getDatabaseClient();
  const { data: row, error } = await db.from('reports').select('*').eq('id', report_id).single();
  if (error || !row) {
    throw new Error(error?.message ?? 'Report not found after generation');
  }
  const reportData = (row as { report: ReportData }).report;
  return { reportId: report_id, reportData };
}
