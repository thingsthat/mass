import type { Message } from 'core/src/workspace/conversation.types';

/**
 * Configuration for describing a field in the system prompt
 */
export type FieldConfig = {
  description: string;
  label?: string;
  /** Custom formatter function for complex data structures */
  formatter?: (value: any, data: any) => string;
  /** Whether to include this field in the detailed breakdown */
  includeInBreakdown?: boolean;
  /** Section header for grouping related fields */
  section?: string;
};

/**
 * Type-safe configuration for generating system prompts from types
 * Ensures all fields of T are documented
 */
export type TypeSystemPromptConfig<T> = {
  [K in keyof Required<T>]: FieldConfig;
};

export const generateTypesSystemPrompt = <T>(
  config: TypeSystemPromptConfig<T>,
  data: T
): string => {
  const sections: Record<string, string[]> = {};
  const fieldsWithoutSection: string[] = [];

  for (const [key, fieldConfig] of Object.entries(config) as Array<[keyof T, FieldConfig]>) {
    const label = fieldConfig.label || String(key);
    const value = data[key];

    // Use custom formatter if provided, otherwise use default formatting
    let formattedContent: string;
    if (fieldConfig.formatter) {
      formattedContent = fieldConfig.formatter(value, data);
    } else {
      // Default formatting
      let formattedValue: string;
      if (Array.isArray(value)) {
        formattedValue = `${value.length} items`;
      } else if (typeof value === 'object' && value !== null) {
        formattedValue = 'object data available';
      } else {
        formattedValue = String(value);
      }
      formattedContent = `- **${label}:** ${fieldConfig.description}: ${formattedValue}`;
    }

    // Group by section if specified
    if (fieldConfig.section) {
      if (!sections[fieldConfig.section]) {
        sections[fieldConfig.section] = [];
      }
      sections[fieldConfig.section].push(formattedContent);
    } else {
      fieldsWithoutSection.push(formattedContent);
    }
  }

  // Build the final output
  const output: string[] = [];

  // Add fields without sections first
  if (fieldsWithoutSection.length > 0) {
    output.push(...fieldsWithoutSection);
  }

  // Add sections
  Object.entries(sections).forEach(([sectionName, sectionFields]) => {
    output.push(`\n### ${sectionName}`);
    output.push(...sectionFields);
  });

  return output.join('\n');
};

/**
 * Calculates time context between messages
 */
export const getTimeContext = (conversation: Message[]): string => {
  if (!conversation || conversation.length < 2) {
    return '';
  }

  const lastMessage = conversation[conversation.length - 1];
  const previousMessage = conversation[conversation.length - 2];

  if (!lastMessage?.timestamp || !previousMessage?.timestamp) {
    return '';
  }

  const lastTime = new Date(lastMessage.timestamp);
  const previousTime = new Date(previousMessage.timestamp);
  const timeDiffMinutes = Math.floor((lastTime.getTime() - previousTime.getTime()) / (1000 * 60));

  if (timeDiffMinutes < 5) {
    return 'Conversation is active and ongoing.';
  } else if (timeDiffMinutes < 60) {
    return `${timeDiffMinutes} minutes have passed since the last exchange.`;
  } else if (timeDiffMinutes < 1440) {
    // Less than 24 hours
    const hours = Math.floor(timeDiffMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} have passed since you last spoke.`;
  } else {
    const days = Math.floor(timeDiffMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} have passed since your last conversation.`;
  }
};

export const getTimeContextSystemPrompt = (conversation?: Message[]): string => {
  const context = conversation ? getTimeContext(conversation) : '';
  return context ? `<time_context>${context}</time_context>` : '';
};

export const getCurrentDateSystemPrompt = (): string => {
  return `<current_date>${new Date().toISOString().split('T')[0]}</current_date>`;
};
