/**
 * Helper functions for parsing structured content from responses
 */
import jaison from 'frontend/src/helpers/jaison';

/**
 * Attempts to fix incomplete JSON by closing incomplete strings, arrays, and objects
 * @param content The potentially incomplete JSON string
 * @returns The fixed JSON string
 */
const fixIncompleteJson = (content: string): string => {
  let result = '';
  let inString = false;
  let escapeNext = false;
  const stack: Array<'{' | '['> = [];

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escapeNext) {
      escapeNext = false;
      result += char;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      result += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      result += char;
      continue;
    }

    if (char === '{') {
      stack.push('{');
      result += char;
    } else if (char === '[') {
      stack.push('[');
      result += char;
    } else if (char === '}') {
      // If we encounter } but there are open arrays, close them first
      // Don't add the } yet - it might be premature (meant to close array instead)
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        // Close the arrays first
        while (stack.length > 0 && stack[stack.length - 1] === '[') {
          result += ']';
          stack.pop();
        }
        // Don't add the } - it was premature, we'll close the object at the end if needed
        // Continue processing the rest of the content
        continue;
      }
      // No open arrays, so this } is valid - close the object
      if (stack.length > 0 && stack[stack.length - 1] === '{') {
        stack.pop();
      }
      result += char;
    } else if (char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        stack.pop();
      }
      result += char;
    } else {
      result += char;
    }
  }

  // If we're still in a string, close it
  if (inString) {
    result += '"';
  }

  // Remove trailing commas before closing structures (common in streaming JSON)
  // Only remove if the last non-whitespace character is a comma
  result = result.replace(/,\s*$/, '');

  // Close any remaining open brackets/braces (in reverse order - arrays first, then objects)
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '[') {
      // Remove trailing comma before closing bracket (if any)
      result = result.replace(/,\s*$/, '');
      result += ']';
    } else if (last === '{') {
      // Remove trailing comma before closing brace (if any)
      result = result.replace(/,\s*$/, '');
      result += '}';
    }
  }

  return result;
};

/**
 * Safely parse JSON from string content, handling code block syntax, streaming JSON, and incomplete JSON
 * @param content The string content to parse
 * @returns The parsed object or null if parsing fails
 */
// TODO: This could be reused, as we do JSON parsing elsewhere in the codebase and this function would be better in a json helper file.
export const parseJsonContent = <T>(content: string): T | null => {
  if (!content) {
    return null;
  }

  let trimmed = content.trim();

  // Strip code block markers (```json prefix and trailing ```)
  if (trimmed.startsWith('```json')) {
    trimmed = trimmed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (trimmed.startsWith('```')) {
    // Handle generic code blocks without json marker
    trimmed = trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Strip single backticks if present
  if (trimmed.startsWith('`')) {
    trimmed = trimmed.replace(/^`/, '').replace(/`$/, '');
  }

  // Quick check: if it doesn't start with { or [, it's probably not JSON
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  // First try normal parsing
  try {
    return JSON.parse(trimmed) as T;
  } catch (_error) {
    // If normal parsing fails, try to fix incomplete JSON first, then repair malformed JSON
    try {
      // Fix incomplete JSON (missing closing quotes, brackets, braces)
      const fixedIncomplete = fixIncompleteJson(trimmed);

      // Try parsing the fixed incomplete JSON
      try {
        return JSON.parse(fixedIncomplete) as T;
      } catch (_parseError) {
        // If still fails, use jaison to repair malformed JSON
        // jaison returns an object directly, not a JSON string
        try {
          const repaired = jaison(fixedIncomplete);

          // If jaison returns a string that matches the input, it means it couldn't repair it
          // This happens when jaison "fixes" completely invalid JSON like "not json at all" -> "not json at all"
          if (typeof repaired === 'string' && repaired === trimmed) {
            return null;
          }

          return repaired as T;
        } catch (_jaisonError) {
          // jaison failed, return null
          return null;
        }
      }
    } catch (_repairError) {
      // Silently return null - don't log errors for incomplete JSON during streaming
      return null;
    }
  }
};
