#!/usr/bin/env tsx
// Simple CLI helper that converts an OpenAPI/Swagger document into a Gateway draft JSON
// so engineers can quickly test the REST→MCP workflow without manually typing schemas.
import fs from 'node:fs/promises';
import path from 'node:path';

type CLIOptions = {
  file?: string;
  inline?: string;
  url?: string;
  out?: string;
  apiName?: string;
  apiDescription?: string;
  baseUrl?: string;
};

type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

type ParameterLocation = 'query' | 'body' | 'path' | 'header';

type ParameterDefinition = {
  name: string;
  description: string;
  type: ParameterType;
  required: boolean;
  location: ParameterLocation;
  mapping?: string;
  default?: unknown;
  enum?: unknown[];
};

type ToolDraft = {
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameters: ParameterDefinition[];
  response?: {
    type: 'json';
    jsonPath?: string;
    example?: unknown;
  };
};

type DraftResult = {
  sourceType: 'openapi';
  sourceRef: string;
  generatedAt: string;
  apis: Array<{
    name: string;
    description: string;
    baseUrl: string;
    auth: { type: 'none' };
    tools: ToolDraft[];
  }>;
};

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options.file && !options.inline && !options.url) {
      throw new Error('Please provide --file <path>, --inline <json>, or --url <url>');
    }

    // Load OpenAPI spec by URL, local file, or inline JSON
    const spec = await loadSpec(options);

    const apiName = options.apiName || spec.info?.title || 'openapi-api';
    const apiDescription = options.apiDescription || spec.info?.description || 'Imported from OpenAPI spec';
    const baseUrl = options.baseUrl || spec.servers?.[0]?.url;

    if (!baseUrl) {
      throw new Error('Base URL not found. Pass --base-url <https://api.example.com> or ensure servers[0].url exists.');
    }

    const tools = buildTools(spec);
    if (tools.length === 0) {
      throw new Error('No endpoints discovered in OpenAPI document.');
    }

    // Draft mirrors GatewayConfig structure so it can be pasted into Console JSON editor directly
    const draft: DraftResult = {
      sourceType: 'openapi',
      sourceRef: options.file
        ? path.resolve(options.file)
        : options.url
        ? options.url
        : 'inline',
      generatedAt: new Date().toISOString(),
      apis: [
        {
          name: apiName,
          description: apiDescription,
          baseUrl,
          auth: { type: 'none' },
          tools,
        },
      ],
    };

    const output = JSON.stringify(draft, null, 2);

    if (options.out) {
      await fs.writeFile(options.out, output, 'utf-8');
      console.log(`✅ Draft saved to ${options.out}`);
    } else {
      console.log(output);
    }
  } catch (error: any) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): CLIOptions {
  const opts: CLIOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      case '--file':
      case '-f':
        opts.file = ensureValue(arg, args[++i]);
        break;
      case '--inline':
      case '-i':
        opts.inline = ensureValue(arg, args[++i]);
        break;
      case '--url':
        opts.url = ensureValue(arg, args[++i]);
        break;
      case '--out':
      case '-o':
        opts.out = ensureValue(arg, args[++i]);
        break;
      case '--api-name':
        opts.apiName = ensureValue(arg, args[++i]);
        break;
      case '--api-description':
        opts.apiDescription = ensureValue(arg, args[++i]);
        break;
      case '--base-url':
        opts.baseUrl = ensureValue(arg, args[++i]);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function ensureValue(flag: string, nextValue?: string): string {
  if (!nextValue) {
    throw new Error(`Missing value for ${flag}`);
  }
  return nextValue;
}

// Read OpenAPI spec from inline JSON, local file, or URL
async function loadSpec(options: CLIOptions): Promise<unknown> {
  if (options.inline) {
    return JSON.parse(options.inline);
  }

  if (options.file) {
    const content = await fs.readFile(options.file, 'utf-8');
    return JSON.parse(content);
  }

  if (options.url) {
    const response = await fetch(options.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI document: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return JSON.parse(text);
  }

  throw new Error('No OpenAPI source provided');
}

// Iterate through all paths/methods and produce a Tool definition for each REST call
function buildTools(spec: any): ToolDraft[] {
  const tools: ToolDraft[] = [];
  const paths = spec.paths || {};

  for (const [pathKey, methods] of Object.entries<any>(paths)) {
    for (const [method, schema] of Object.entries<any>(methods)) {
      const httpMethod = method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(httpMethod)) {
        continue;
      }

      const parameters = collectParameters(schema, methods);
      const tool: ToolDraft = {
        name: buildToolName(httpMethod, pathKey),
        description: schema.summary || schema.description || `${httpMethod} ${pathKey}`,
        endpoint: pathKey,
        method: httpMethod as ToolDraft['method'],
        parameters,
        response: buildResponse(schema.responses),
      };

      tools.push(tool);
    }
  }

  return tools;
}

// Merge path-level parameters + operation-level parameters + body schema
function collectParameters(schema: any, pathObject: any): ParameterDefinition[] {
  const params: ParameterDefinition[] = [];

  const combined = [...(pathObject.parameters || []), ...(schema.parameters || [])];

  for (const param of combined) {
    if (!param || !param.name || !param.in) {
      continue;
    }
    const parameter: ParameterDefinition = {
      name: param.name,
      description: param.description || '',
      type: mapJsonType(param.schema),
      required: Boolean(param.required),
      location: param.in,
      enum: param.schema?.enum,
      default: param.schema?.default,
    } as ParameterDefinition;

    params.push(parameter);
  }

  // Request body (JSON only)
  const requestBody = schema.requestBody;
  const jsonSchema = requestBody?.content?.['application/json']?.schema;
  if (jsonSchema) {
    if (jsonSchema.type === 'object' && jsonSchema.properties) {
      for (const [name, propertySchema] of Object.entries<any>(jsonSchema.properties)) {
        const parameter: ParameterDefinition = {
          name,
          description: propertySchema.description || '',
          type: mapJsonType(propertySchema),
          required: jsonSchema.required?.includes(name) ?? false,
          location: 'body',
          enum: propertySchema.enum,
          default: propertySchema.default,
        };
        params.push(parameter);
      }
    } else {
      params.push({
        name: 'payload',
        description: 'Request body payload',
        type: mapJsonType(jsonSchema),
        required: true,
        location: 'body',
      });
    }
  }

  return params;
}

// Convert OpenAPI primitive type to our simplified parameter type
function mapJsonType(schema: any): ParameterType {
  const type = schema?.type;
  switch (type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

// Pick first 2xx response and capture JSON example for Console preview
function buildResponse(responses: any) {
  if (!responses) {
    return undefined;
  }

  const keys = Object.keys(responses).sort();
  const successKey = keys.find((key) => key.startsWith('2'));
  if (!successKey) {
    return undefined;
  }

  const response = responses[successKey];
  const example = response?.content?.['application/json']?.example ||
    response?.content?.['application/json']?.examples?.default?.value;

  return {
    type: 'json' as const,
    example,
    jsonPath: '$',
  };
}

function buildToolName(method: string, endpoint: string): string {
  const normalized = endpoint
    .replace(/\{(.+?)\}/g, 'by-$1')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${method.toLowerCase()}-${normalized || 'root'}`;
}

await main();
