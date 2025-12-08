/**
 * Parameter mapper
 * Maps MCP tool arguments to REST API parameters
 */

import { z } from 'zod';
import { ParameterDefinition } from '../config/types.js';
import { logger } from '../utils/logger.js';

export class ParameterMapper {
  /**
   * Map MCP arguments to REST API parameters
   */
  static mapParameters(
    mcpArgs: Record<string, any>,
    paramDefs: ParameterDefinition[],
    endpoint: string
  ): {
    path: string;
    query: Record<string, any>;
    body: Record<string, any>;
    headers: Record<string, string>;
  } {
    const result = {
      path: endpoint,
      query: {} as Record<string, any>,
      body: {} as Record<string, any>,
      headers: {} as Record<string, string>,
    };

    for (const paramDef of paramDefs) {
      const value = mcpArgs[paramDef.name] ?? paramDef.default;

      // Skip undefined optional parameters
      if (value === undefined) {
        if (paramDef.required) {
          throw new Error(`Required parameter missing: ${paramDef.name}`);
        }
        continue;
      }

      const targetName = paramDef.mapping || paramDef.name;

      switch (paramDef.location) {
        case 'path':
          // Replace path parameter {paramName}
          result.path = result.path.replace(
            new RegExp(`\\{${paramDef.name}\\}`, 'g'),
            encodeURIComponent(String(value))
          );
          break;

        case 'query':
          result.query[targetName] = value;
          break;

        case 'body':
          result.body[targetName] = value;
          break;

        case 'header':
          result.headers[targetName] = String(value);
          break;
      }
    }

    logger.debug('[ParameterMapper] Mapped parameters', {
      path: result.path,
      queryCount: Object.keys(result.query).length,
      bodyCount: Object.keys(result.body).length,
      headerCount: Object.keys(result.headers).length,
    });

    return result;
  }

  /**
   * Generate Zod Schema for MCP tool input
   */
  static generateSchema(paramDefs: ParameterDefinition[]): z.AnyZodObject {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const param of paramDefs) {
      let schema: z.ZodTypeAny;

      // Create base schema based on type
      switch (param.type) {
        case 'string':
          schema = z.string();
          break;
        case 'number':
          schema = z.number();
          break;
        case 'boolean':
          schema = z.boolean();
          break;
        case 'array':
          schema = z.array(z.any());
          break;
        case 'object':
          schema = z.record(z.any());
          break;
        default:
          schema = z.any();
      }

      // Add description
      schema = schema.describe(param.description);

      // Add enum if specified
      if (param.enum && param.type === 'string') {
        schema = z.enum(param.enum as [string, ...string[]]);
      }

      // Add default if specified
      if (param.default !== undefined) {
        schema = schema.default(param.default);
      }

      // Make optional if not required
      if (!param.required) {
        schema = schema.optional();
      }

      shape[param.name] = schema;
    }

    return z.object(shape).catchall(z.unknown());
  }
}
