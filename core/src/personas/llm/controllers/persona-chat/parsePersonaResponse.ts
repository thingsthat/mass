/**
 * Parse raw streamed JSON from the persona chat model into our structure.
 * Used by the backend so the API returns { content, followup } instead of raw Gemini chunks.
 */

/**
 * Consume an SSE stream that emits chat.completion.chunk lines and return the
 * concatenated delta.content string. Single place for this logic so the backend
 * does not duplicate stream parsing.
 */
export async function consumeChatCompletionStream(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let rawBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = buffer.endsWith('\n') ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }
      const dataContent = trimmed.slice(5).trim();
      if (!dataContent || dataContent === '[DONE]') {
        continue;
      }
      try {
        const parsed = JSON.parse(dataContent);
        const choice = parsed?.choices?.[0];
        if (choice?.delta?.content != null && typeof choice.delta.content === 'string') {
          rawBuffer += choice.delta.content;
        }
      } catch {
        // ignore malformed lines
      }
    }
  }
  if (buffer) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data:')) {
      const dataContent = trimmed.slice(5).trim();
      if (dataContent && dataContent !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataContent);
          const choice = parsed?.choices?.[0];
          if (choice?.delta?.content != null && typeof choice.delta.content === 'string') {
            rawBuffer += choice.delta.content;
          }
        } catch {
          // ignore
        }
      }
    }
  }
  return rawBuffer;
}

/**
 * Extract the current partial content string from a streaming JSON buffer.
 * The model streams JSON like {"content":["..."], "followup":[...]}; this returns
 * the first content string even when it is incomplete (no closing quote yet).
 */
export function extractPartialContentFromStreamingJson(buffer: string): string {
  const contentPrefix = '"content":[';
  const idx = buffer.indexOf(contentPrefix);
  if (idx === -1) {
    return '';
  }
  const afterPrefix = buffer.slice(idx + contentPrefix.length);
  const trimmed = afterPrefix.trimStart();
  if (!trimmed.startsWith('"')) {
    return '';
  }
  const result: string[] = [];
  let i = 1;
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '\\') {
      const next = trimmed[i + 1];
      if (next === '"' || next === '\\') {
        result.push(next);
        i += 2;
        continue;
      }
      result.push(ch);
      if (next !== undefined) {
        result.push(next);
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (ch === '"') {
      break;
    }
    result.push(ch);
    i += 1;
  }
  return result.join('');
}

export type PersonaResponseParsed = {
  content: string;
  followup?: string[];
};

/**
 * Result of sanitising a single-persona response that may contain other speakers' text.
 */
export type SanitiseSinglePersonaResult = {
  content: string;
  hadOtherSpeakers: boolean;
};

/**
 * Strip other-speaker blocks from a single-persona response. When the model returns
 * "Name A: ...\n\nName B: ..." for one persona's turn, keep only the block matching
 * personaName (or the first block if none match) and log when we had to strip.
 */
export function sanitiseSinglePersonaContent(
  content: string,
  personaName: string
): SanitiseSinglePersonaResult {
  const trimmed = (content ?? '').trim();
  if (!trimmed) {
    return { content: '', hadOtherSpeakers: false };
  }
  const normalisedName = (personaName ?? '').trim().toLowerCase();
  const blocks: { name: string; text: string }[] = [];
  const blockPattern = /\n\n(?=[A-Za-z][^:\n]*:)/g;
  const parts = trimmed.split(blockPattern);
  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex > 0 && colonIndex < 80) {
      const name = part.slice(0, colonIndex).trim();
      const text = part.slice(colonIndex + 1).trim();
      blocks.push({ name, text });
    } else {
      blocks.push({ name: '', text: part.trim() });
    }
  }
  if (blocks.length <= 1) {
    return { content: trimmed, hadOtherSpeakers: false };
  }
  const match = blocks.find(b => b.name && b.name.toLowerCase() === normalisedName);
  const fallback = blocks[0];
  const chosen = match ?? fallback;
  const hadOtherSpeakers = true;
  return {
    content: chosen.name ? `${chosen.name}: ${chosen.text}` : chosen.text,
    hadOtherSpeakers,
  };
}

export function parsePersonaResponse(raw: string): PersonaResponseParsed | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      content?: string | string[];
      followup?: string[];
    };
    if (parsed && (parsed.content !== undefined || Array.isArray(parsed.followup))) {
      const content = Array.isArray(parsed.content)
        ? parsed.content.join('\n\n')
        : typeof parsed.content === 'string'
          ? parsed.content
          : '';
      return {
        content,
        followup: Array.isArray(parsed.followup) ? parsed.followup : undefined,
      };
    }
  } catch {
    const extracted = extractContentAndFollowupLenient(trimmed);
    if (extracted) {
      return extracted;
    }
  }
  return null;
}

function extractContentAndFollowupLenient(jsonLike: string): PersonaResponseParsed | null {
  let content = '';
  let followup: string[] | undefined;
  const contentKey = '"content"';
  const followupKey = '"followup"';
  const contentIndex = jsonLike.indexOf(contentKey);
  const followupIndex = jsonLike.indexOf(followupKey);
  if (contentIndex === -1) {
    return null;
  }
  const afterContentKey = jsonLike.slice(contentIndex + contentKey.length);
  const contentValueStart = afterContentKey.search(/\S/);
  if (contentValueStart === -1) {
    return null;
  }
  const contentValueSlice = afterContentKey.slice(contentValueStart);
  if (contentValueSlice.startsWith('[')) {
    const contentArray = extractArrayBracketBalanced(contentValueSlice);
    if (contentArray !== null) {
      try {
        const parsed = JSON.parse('[' + contentArray + ']') as string[];
        content = parsed.join('\n\n');
      } catch {
        content = extractFirstStringFromArray(contentArray);
      }
    }
  } else if (contentValueSlice.startsWith('"')) {
    const first = extractFirstJsonString(contentValueSlice);
    if (first !== null) {
      content = first;
    }
  }
  if (followupIndex !== -1) {
    const afterFollowupKey = jsonLike.slice(followupIndex + followupKey.length);
    const followupValueStart = afterFollowupKey.search(/\S/);
    if (followupValueStart !== -1 && afterFollowupKey.slice(followupValueStart).startsWith('[')) {
      const followupArray = extractArrayBracketBalanced(afterFollowupKey.slice(followupValueStart));
      if (followupArray !== null) {
        try {
          followup = JSON.parse('[' + followupArray + ']') as string[];
        } catch {
          followup = extractStringArrayLenient(followupArray);
        }
      }
    }
  }
  if (content === '' && !followup?.length) {
    return null;
  }
  return { content, followup };
}

function extractArrayBracketBalanced(str: string): string | null {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '[') {
      if (depth === 0) {
        start = i + 1;
      }
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return str.slice(start, i);
      }
    }
  }
  return null;
}

function extractFirstJsonString(str: string): string | null {
  if (!str.startsWith('"')) {
    return null;
  }
  let i = 1;
  while (i < str.length) {
    if (str[i] === '\\') {
      i += 2;
      continue;
    }
    if (str[i] === '"') {
      try {
        return JSON.parse(str.slice(0, i + 1));
      } catch {
        return str.slice(1, i);
      }
    }
    i += 1;
  }
  return null;
}

function extractFirstStringFromArray(arrayContent: string): string {
  const first = extractFirstJsonString(arrayContent.trim());
  return first ?? (arrayContent.replace(/^["\s,]+|["\s,]+$/g, '').replace(/\\"/g, '"') || '');
}

function extractStringArrayLenient(arrayContent: string): string[] {
  const result: string[] = [];
  let rest = arrayContent.trim();
  while (rest.length > 0) {
    if (rest.startsWith(',')) {
      rest = rest.slice(1).trim();
      continue;
    }
    const first = extractFirstJsonString(rest);
    if (first !== null) {
      result.push(first);
      const consumed = consumeOneJsonString(rest);
      rest = rest.slice(consumed).trim();
    } else {
      break;
    }
  }
  return result;
}

function consumeOneJsonString(str: string): number {
  const trimmed = str.trim();
  if (!trimmed.startsWith('"')) {
    return 0;
  }
  let i = 1;
  while (i < trimmed.length) {
    if (trimmed[i] === '\\') {
      i += 2;
      continue;
    }
    if (trimmed[i] === '"') {
      return trimmed.slice(0, i + 1).length;
    }
    i += 1;
  }
  return 0;
}
