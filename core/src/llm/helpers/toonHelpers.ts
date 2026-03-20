import * as toonModule from '@toon-format/toon';

/**
 * Ensures the TOON module is loaded. No-op when using static import; kept for API compatibility.
 */
export async function ensureToonModule() {
  // Static import: module is always loaded
}

/**
 * Formats an array of uniform objects as TOON format for efficient token usage in LLM prompts
 * TOON is particularly effective for arrays of objects with the same fields (tabular data)
 */
export function formatAsToon<T extends Record<string, any>>(
  data: T[],
  options?: {
    delimiter?: ',' | '\t' | '|';
    lengthMarker?: '#';
  }
): string {
  if (!data || data.length === 0) {
    return '';
  }

  // TOON works best with uniform objects (same keys)
  // Encode the array as TOON format
  return toonModule.encode(data, {
    delimiter: options?.delimiter || ',',
    lengthMarker: options?.lengthMarker,
  });
}

export function formatAsToonObject(data: any): string {
  return toonModule.encode(data, {
    delimiter: ',',
    lengthMarker: '#',
    indent: 2,
  });
}
