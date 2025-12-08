/**
 * Configuration types for REST Gateway
 * Based on PETA REST Gateway Implementation Document
 */

import { z } from 'zod';

/**
 * Authentication configuration
 */
export const AuthConfigSchema = z
  .object({
    type: z.enum(['bearer', 'query_param', 'header', 'basic', 'none']),
    param: z.string().optional(),
    header: z.string().optional(),
    value: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  })
  .catchall(z.unknown());

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/**
 * Parameter definition
 */
export const ParameterDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean(),
    default: z.any().optional(),
    location: z.enum(['query', 'body', 'path', 'header']),
    mapping: z.string().optional(),
    enum: z.array(z.any()).optional(),
    pattern: z.string().optional(),
  })
  .catchall(z.unknown());

export type ParameterDefinition = z.infer<typeof ParameterDefinitionSchema>;

/**
 * Response transformation configuration
 */
export const ResponseTransformSchema = z
  .object({
    type: z.enum(['json', 'text', 'raw']),
    jsonPath: z.string().optional(),
    template: z.string().optional(),
    errorPath: z.string().optional(),
    truncate: z.number().optional(), // Maximum response size
  })
  .catchall(z.unknown());

export type ResponseTransform = z.infer<typeof ResponseTransformSchema>;

/**
 * Tool definition
 */
export const ToolDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    parameters: z.array(ParameterDefinitionSchema),
    response: ResponseTransformSchema.optional(),
    headers: z.record(z.string()).optional(),
    timeout: z.number().optional(),
  })
  .catchall(z.unknown());

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/**
 * API definition
 */
export const APIDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    baseUrl: z.string().url(),
    auth: AuthConfigSchema,
    tools: z.array(ToolDefinitionSchema).min(1),
    headers: z.record(z.string()).optional(),
    timeout: z.number().optional(),
  })
  .catchall(z.unknown());

export type APIDefinition = z.infer<typeof APIDefinitionSchema>;

/**
 * Complete API configuration
 */
export const APIConfigSchema = z
  .object({
    apis: z.array(APIDefinitionSchema).min(1).max(20), // Max 20 APIs per config
  })
  .catchall(z.unknown());

export type APIConfig = z.infer<typeof APIConfigSchema>;

/**
 * Configuration limits
 */
export const CONFIG_LIMITS = {
  MAX_SIZE_BYTES: 30 * 1024, // 30KB
  MAX_APIS: 20,
  MAX_TOOLS_PER_API: 20,
  MAX_TOTAL_TOOLS: 20,
  MAX_PARAMETERS_PER_TOOL: 20,
  DEFAULT_TIMEOUT: 30000, // 30s
  MAX_TIMEOUT: 300000, // 5min
  MAX_RESPONSE_SIZE: 1024 * 1024, // 1MB
} as const;
