import { type Schema, Type as SchemaType } from '@google/genai';
import { z } from 'zod';

/**
 * Convert Zod schema to standard JSON Schema format
 * This is the base conversion - all other conversions start here
 * Pipeline: Zod → JSON Schema
 * Uses Zod v4's native JSON Schema generation
 */
export function zodToJsonSchema(zodSchema: z.ZodTypeAny): any {
  try {
    // Use Zod v4's native toJSONSchema static method
    const result = z.toJSONSchema(zodSchema);

    // Validate the result
    if (!result || typeof result !== 'object') {
      throw new Error('Zod toJSONSchema produced invalid result');
    }

    // Validate that we have actual schema content
    const keys = Object.keys(result);
    const hasSchemaContent =
      result.type !== undefined ||
      result.properties !== undefined ||
      (keys.length > 0 && !keys.every(k => ['$schema'].includes(k)));

    if (!hasSchemaContent) {
      const schemaType = (zodSchema as any).constructor?.name || 'unknown';
      throw new Error(
        `Zod toJSONSchema produced empty schema. Schema type: ${schemaType}, ` +
          `Result keys: ${keys.join(', ')}, Result: ${JSON.stringify(result)}`
      );
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const schemaType = (zodSchema as any).constructor?.name || 'unknown';
    throw new Error(
      `Failed to convert Zod schema to JSON Schema: ${errorMessage}\n` +
        `Schema type: ${schemaType}`
    );
  }
}

/**
 * Convert JSON Schema to Gemini Schema format
 * Pipeline: JSON Schema → Gemini Schema
 */
export const jsonSchemaToGeminiSchema = (jsonSchema: any): Schema => {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return { type: SchemaType.STRING };
  }

  const converted: any = { ...jsonSchema };

  // Remove fields Gemini doesn't accept (can break structured output or be ignored)
  delete converted.$schema;
  delete converted.propertyNames;
  delete converted.default;

  // Convert type from string to Gemini SchemaType enum
  if (converted.type) {
    const typeMap: Record<
      string,
      | typeof SchemaType.STRING
      | typeof SchemaType.NUMBER
      | typeof SchemaType.BOOLEAN
      | typeof SchemaType.ARRAY
      | typeof SchemaType.OBJECT
    > = {
      string: SchemaType.STRING,
      number: SchemaType.NUMBER,
      integer: SchemaType.NUMBER,
      boolean: SchemaType.BOOLEAN,
      array: SchemaType.ARRAY,
      object: SchemaType.OBJECT,
    };
    converted.type = typeMap[converted.type] || SchemaType.STRING;
  }

  // Gemini requires all numeric constraints to be numbers, not strings
  // Ensure all numeric constraints are numbers (convert from strings if needed)

  if (converted.minItems !== undefined) {
    converted.minItems =
      typeof converted.minItems === 'string'
        ? parseInt(converted.minItems, 10)
        : converted.minItems;
  }
  if (converted.maxItems !== undefined) {
    converted.maxItems =
      typeof converted.maxItems === 'string'
        ? parseInt(converted.maxItems, 10)
        : converted.maxItems;
  }
  if (converted.minimum !== undefined) {
    converted.minimum =
      typeof converted.minimum === 'string' ? parseFloat(converted.minimum) : converted.minimum;
  }
  if (converted.maximum !== undefined) {
    converted.maximum =
      typeof converted.maximum === 'string' ? parseFloat(converted.maximum) : converted.maximum;
  }

  // Handle enum format for Gemini
  if (converted.enum && Array.isArray(converted.enum)) {
    converted.format = 'enum';
  }

  // Recursively convert properties
  if (converted.properties) {
    const convertedProperties: Record<string, any> = {};
    for (const [key, value] of Object.entries(converted.properties)) {
      convertedProperties[key] = jsonSchemaToGeminiSchema(value);
    }
    converted.properties = convertedProperties;
  }

  // Recursively convert additionalProperties only when it is a schema object (e.g. from z.record()); do not recurse into boolean false
  if (converted.additionalProperties !== undefined && typeof converted.additionalProperties === 'object') {
    converted.additionalProperties = jsonSchemaToGeminiSchema(converted.additionalProperties);
  }

  // Recursively convert items
  if (converted.items) {
    converted.items = jsonSchemaToGeminiSchema(converted.items);
  }

  // Recursively convert anyOf
  if (converted.anyOf && Array.isArray(converted.anyOf)) {
    converted.anyOf = converted.anyOf.map((item: any) => jsonSchemaToGeminiSchema(item));
  }

  // Recursively convert oneOf
  if (converted.oneOf && Array.isArray(converted.oneOf)) {
    converted.oneOf = converted.oneOf.map((item: any) => jsonSchemaToGeminiSchema(item));
  }

  return converted;
};

/**
 * Convert JSON Schema to OpenAI Schema format (with strict mode handling)
 * Pipeline: JSON Schema → OpenAI Schema
 */
function jsonSchemaToOpenAISchema(jsonSchema: any, strict: boolean): any {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return jsonSchema;
  }

  const converted = { ...jsonSchema };

  // OpenAI requires the root schema to be type: "object" with properties
  // Ensure properties exist and are preserved
  if (converted.properties && typeof converted.properties === 'object') {
    // If we have properties, ensure type is "object"
    if (!converted.type || converted.type === 'null' || converted.type === null) {
      converted.type = 'object';
    }

    // If type is an array (union types), extract "object" if present
    if (Array.isArray(converted.type)) {
      converted.type = converted.type.includes('object') ? 'object' : converted.type[0] || 'object';
    }

    // OpenAI requires additionalProperties to be explicitly false for object schemas
    if (converted.type === 'object' && converted.additionalProperties === undefined) {
      converted.additionalProperties = false;
    }

    // Ensure properties object is preserved (don't let it be deleted)
    if (!converted.properties || typeof converted.properties !== 'object') {
      throw new Error('OpenAI schema validation failed: properties were lost during conversion');
    }
  } else if (converted.type === 'object') {
    // If type is "object" but no properties, this is invalid for OpenAI
    throw new Error(
      'OpenAI schema validation failed: object type requires properties. ' +
        `Schema keys: ${Object.keys(converted).join(', ')}`
    );
  }

  // OpenAI strict mode requires all properties to be in the required array
  if (strict && converted.type === 'object' && converted.properties) {
    const allPropertyKeys = Object.keys(converted.properties);
    if (allPropertyKeys.length > 0) {
      // Ensure required array exists and includes all properties
      if (!converted.required || !Array.isArray(converted.required)) {
        converted.required = [...allPropertyKeys];
      } else {
        // Merge existing required with all property keys
        const requiredSet = new Set([...converted.required, ...allPropertyKeys]);
        converted.required = Array.from(requiredSet);
      }
    }
  }

  // Recursively convert nested objects
  if (converted.properties) {
    const convertedProperties: Record<string, any> = {};
    for (const [key, value] of Object.entries(converted.properties)) {
      convertedProperties[key] = jsonSchemaToOpenAISchema(value, strict);
    }
    converted.properties = convertedProperties;
  }

  // Recursively convert items
  if (converted.items) {
    converted.items = jsonSchemaToOpenAISchema(converted.items, strict);
  }

  // Recursively convert anyOf
  if (converted.anyOf && Array.isArray(converted.anyOf)) {
    converted.anyOf = converted.anyOf.map((item: any) => jsonSchemaToOpenAISchema(item, strict));
  }

  // Recursively convert oneOf
  if (converted.oneOf && Array.isArray(converted.oneOf)) {
    converted.oneOf = converted.oneOf.map((item: any) => jsonSchemaToOpenAISchema(item, strict));
  }

  return converted;
}

/**
 * Convert Zod schema to OpenAI Schema format
 * Pipeline: Zod → JSON Schema → OpenAI Schema
 */
export function zodToOpenAISchema(zodSchema: z.ZodTypeAny, strict: boolean): any {
  try {
    // Use Zod v4's native JSON Schema generation
    const jsonSchema = zodToJsonSchema(zodSchema);

    // Validate that we have a valid JSON Schema object
    if (!jsonSchema || typeof jsonSchema !== 'object') {
      const schemaStr = JSON.stringify(jsonSchema, null, 2);
      throw new Error(
        `Invalid JSON Schema: schema must be an object. Got: ${typeof jsonSchema}\n` +
          `Schema content: ${schemaStr.substring(0, 500)}`
      );
    }

    // Validate that we have an object schema with properties
    if (!jsonSchema.properties || typeof jsonSchema.properties !== 'object') {
      const schemaStr = JSON.stringify(jsonSchema, null, 2);
      throw new Error(
        `Invalid schema for OpenAI: schema must be an object type with properties.\n` +
          `Schema structure:\n` +
          `  - type: ${jsonSchema.type || 'undefined'} (${typeof jsonSchema.type})\n` +
          `  - properties: ${jsonSchema.properties ? 'exists' : 'missing'}\n` +
          `  - schema keys: ${Object.keys(jsonSchema).join(', ')}\n` +
          `  - full schema:\n${schemaStr.substring(0, 1000)}`
      );
    }

    // Ensure type is set to "object" if we have properties
    if (!jsonSchema.type || jsonSchema.type === 'null' || jsonSchema.type === null) {
      jsonSchema.type = 'object';
    }

    // Handle array types (unions) - extract "object" if present
    if (Array.isArray(jsonSchema.type)) {
      jsonSchema.type = jsonSchema.type.includes('object')
        ? 'object'
        : jsonSchema.type[0] || 'object';
    }

    // Apply OpenAI-specific transformations
    return jsonSchemaToOpenAISchema(jsonSchema, strict);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
    const schemaType = (zodSchema as any).constructor?.name || 'unknown';
    throw new Error(
      `Failed to convert Zod schema to OpenAI format: ${errorMessage}\n` +
        `Schema type: ${schemaType}`
    );
  }
}

/**
 * Check if a schema is a Zod schema
 */
export function isZodSchema(schema: any): schema is z.ZodTypeAny {
  return schema && typeof schema === 'object' && '_def' in schema && 'parse' in schema;
}
