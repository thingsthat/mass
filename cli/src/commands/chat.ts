import * as readline from 'node:readline';

import { getDatabaseClient } from 'core/src/database/client';
import { resolveFilePathsToBase64 } from 'core/src/helpers/resolveFilePath';
import { getPersonasByIds } from 'core/src/personas/controllers/personas';
import {
  consumeChatCompletionStream,
  parsePersonaResponse,
} from 'core/src/personas/llm/controllers/persona-chat/parsePersonaResponse';
import { generatePersonaChatStream } from 'core/src/personas/llm/controllers/persona-chat/personaChatLLM';
import { getWorkspaceById } from 'core/src/workspace/controllers/workspaces';
import { expandPersonaIds } from 'core/src/workspace/expandPersonaIds';

import { isInteractive, selectFromList } from 'cli/src/commands/prompts';

import type { Persona } from 'core/src/personas/persona.types';
import type { Conversation, Message, SpeakerReply } from 'core/src/workspace/conversation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

const ansi = {
  reset: '\x1b[0m',
  dim: '\x1b[90m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
} as const;

export type ChatOptions = {
  workspaceId?: string;
  /** One or more persona IDs (overrides workspace membership when set). */
  personaIds?: string[];
  /** Cohort ID (expand to all personas in cohort; used when no personaIds). */
  cohortId?: string;
  message?: string;
  /** File path to ask opinion on (resolved from cwd). */
  filePath?: string;
};

export async function runChat(options: ChatOptions): Promise<void> {
  const db = getDatabaseClient();
  const { workspaceId, personaIds, cohortId, message: messageArg, filePath } = options;

  const files = filePath ? await resolveFilePathsToBase64([filePath]) : undefined;

  let workspace: Workspace;
  if (workspaceId) {
    const w = await getWorkspaceById(db, workspaceId);
    if (!w) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    workspace = w;
  } else {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const conversation: Conversation = { name: '', messages: [] };
    const newWorkspace = {
      id,
      name: 'CLI workspace',
      description: '',
      conversation,
      created_at: now,
      updated_at: now,
    };
    const { error } = await db.from('workspaces').insert(newWorkspace).select('id').single();
    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`);
    }
    workspace = { ...newWorkspace, conversation: { name: '', messages: [] } };
  }

  let targetPersonaIds: string[];
  if (personaIds?.length) {
    targetPersonaIds = personaIds;
  } else if (cohortId) {
    const { allPersonaIds } = await expandPersonaIds(db, [], [cohortId]);
    targetPersonaIds = Array.from(new Set(allPersonaIds));
  } else {
    const workspacePersonaIds = workspace.conversation?.persona_ids ?? [];
    const workspaceCohortIds = workspace.conversation?.cohort_ids ?? [];
    if (workspacePersonaIds.length || workspaceCohortIds.length) {
      const { allPersonaIds } = await expandPersonaIds(db, workspacePersonaIds, workspaceCohortIds);
      targetPersonaIds = Array.from(new Set(allPersonaIds));
    } else {
      if (!isInteractive()) {
        console.error(
          'Chat requires a persona or cohort. Use: mass chat -p <persona-id> [-m "message"] or -w <workspace-id> (with workspace that has personas/cohorts) or -c <cohort-id>'
        );
        process.exit(1);
      }
      const response = await db.from('personas').select('id, name, metadata');
      if (response.error) {
        throw new Error(response.error.message);
      }
      const rows = (response.data ?? []) as {
        id: string;
        name?: string;
        metadata?: Record<string, unknown>;
      }[];
      if (rows.length === 0) {
        console.error('No personas. Create some with: mass persona create -c <cohort-id>');
        process.exit(1);
      }
      const choices = rows.map(r => {
        const name = (r.name ?? (r.metadata as { name?: string })?.name ?? r.id).slice(0, 50);
        return { value: r.id, name: `${name} (${r.id})` };
      });
      const selectedId = await selectFromList(choices, 'Select persona to chat with');
      targetPersonaIds = [selectedId];
    }
  }

  if (targetPersonaIds.length === 0) {
    console.error(
      'No personas to chat with. Add personas or a cohort to the workspace, or use -p / -c.'
    );
    process.exit(1);
  }

  const personas = await getPersonasByIds(db, targetPersonaIds);
  if (personas.length === 0) {
    throw new Error('No valid personas found for the given targets');
  }

  if (messageArg) {
    console.log(`${ansi.yellow}You: ${messageArg}${ansi.reset}`);
    await sendToTargets(db, workspace, workspaceId, personas, messageArg, files);
    if (!workspaceId) {
      console.error('Workspace ID (save for later):', workspace.id);
    }
    return;
  }

  if (process.stdin.isTTY) {
    await runInteractiveChat(db, workspace, workspaceId, personas, files);
    return;
  }

  const messageText = await new Promise<string>(resolve => {
    const chunks: string[] = [];
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c: string) => chunks.push(c));
    process.stdin.on('end', () => resolve(chunks.join('').trim()));
  });

  if (!messageText.trim()) {
    console.error('No message provided. Use -m "..." or pipe stdin.');
    process.exit(1);
  }

  await sendToTargets(db, workspace, workspaceId, personas, messageText, files);
  if (!workspaceId) {
    console.error('Workspace ID (save for later):', workspace.id);
  }
}

async function sendToTargets(
  db: ReturnType<typeof getDatabaseClient>,
  workspace: Workspace,
  workspaceId: string | undefined,
  personas: Persona[],
  messageText: string,
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<void> {
  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: messageText,
    timestamp: new Date().toISOString(),
  };
  const answerId = crypto.randomUUID();
  const messages: Message[] = [...(workspace.conversation?.messages ?? []), userMessage];

  const speakerReplies: SpeakerReply[] = [];
  let mergedFollowup: string[] | undefined;

  for (const persona of personas) {
    const stream = await generatePersonaChatStream({
      messages,
      persona,
      workspaceId: workspace.id,
      files,
    });
    const rawBuffer = await consumeChatCompletionStream(stream);
    const parsed = parsePersonaResponse(rawBuffer);
    const content = parsed?.content ?? (rawBuffer.trim() || '');
    const text = Array.isArray(content) ? content.join('\n\n') : String(content);
    const name = persona.details?.name ?? persona.id;
    speakerReplies.push({ persona_id: persona.id, name, content: text });
    if (parsed?.followup?.length) {
      mergedFollowup = parsed.followup;
    }
  }

  const structuredContent = JSON.stringify({ content: speakerReplies, followup: mergedFollowup });
  const assistantMessage: Message = {
    id: answerId,
    role: 'assistant',
    content: structuredContent,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [
    ...(workspace.conversation?.messages ?? []),
    userMessage,
    assistantMessage,
  ];
  const updatedConversation: Conversation = {
    name: workspace.conversation?.name ?? '',
    ...workspace.conversation,
    messages: updatedMessages,
  };

  await db
    .from('workspaces')
    .update({
      conversation: updatedConversation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspace.id);

  const display = formatMultiSpeakerResponse(speakerReplies, mergedFollowup);
  console.log(display);
}

function formatMultiSpeakerResponse(speakerReplies: SpeakerReply[], followup?: string[]): string {
  const parts: string[] = [];
  for (const reply of speakerReplies) {
    const name = reply.name ?? reply.persona_id;
    if (reply.content.trim()) {
      parts.push(`${ansi.cyan}${name}: ${reply.content.trim()}${ansi.reset}`);
    }
  }
  if (Array.isArray(followup) && followup.length > 0) {
    const numbered = followup.map((q, i) => `${i + 1}. ${q}`).join('\n');
    parts.push(`${ansi.dim}\n${numbered}\n\nOr just type your next message.${ansi.reset}`);
  }
  return parts.join('\n\n');
}

async function runInteractiveChat(
  db: ReturnType<typeof getDatabaseClient>,
  workspace: Workspace,
  workspaceId: string | undefined,
  personas: Persona[],
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<void> {
  if (!workspaceId) {
    console.error('Workspace ID (save for later):', workspace.id);
  }
  console.error(
    `Chat with ${personas.length} persona(s). Type a message and press Enter. Empty line or "exit" to quit.\n`
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = `${ansi.yellow}You: ${ansi.reset}`;
  const ask = (): void => {
    rl.question(prompt, (line: string) => {
      const text = line?.trim() ?? '';
      if (text === '' || text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
        rl.close();
        return;
      }
      void sendToTargets(db, workspace, workspaceId, personas, text, files).then(() => {
        console.log('');
        ask();
      });
    });
  };
  ask();
}
