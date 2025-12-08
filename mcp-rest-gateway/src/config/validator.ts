/**
 * Configuration validator
 * Validates configuration against schema and business rules
 */

import { APIConfig, APIConfigSchema, CONFIG_LIMITS } from './types.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ConfigValidator {
  /**
   * Validate complete configuration
   */
  static validate(config: any): APIConfig {
    logger.info('[ConfigValidator] Validating configuration...');

    // 1. Schema validation
    let validated: APIConfig;
    try {
      validated = APIConfigSchema.parse(config);
    } catch (error: any) {
      throw new ValidationError('Schema validation failed', {
        errors: error.errors || error.message,
      });
    }

    // 2. Business rules validation
    this.validateSize(config);
    this.validateToolCounts(validated);
    this.validateURLs(validated);
    this.validateToolNames(validated);

    logger.info('[ConfigValidator] Configuration validated successfully');
    return validated;
  }

  /**
   * Validate configuration size
   */
  private static validateSize(config: any): void {
    const size = JSON.stringify(config).length;
    if (size > CONFIG_LIMITS.MAX_SIZE_BYTES) {
      throw new ValidationError(
        `Configuration too large: ${size} bytes (max ${CONFIG_LIMITS.MAX_SIZE_BYTES} bytes / 30KB)`
      );
    }
    logger.debug('[ConfigValidator] Size check passed', { size });
  }

  /**
   * Validate tool counts
   */
  private static validateToolCounts(config: APIConfig): void {
    let totalTools = 0;

    for (const api of config.apis) {
      const toolCount = api.tools.length;

      if (toolCount > CONFIG_LIMITS.MAX_TOOLS_PER_API) {
        throw new ValidationError(
          `API "${api.name}" has too many tools: ${toolCount} (max ${CONFIG_LIMITS.MAX_TOOLS_PER_API})`
        );
      }

      totalTools += toolCount;

      // Validate parameter counts
      for (const tool of api.tools) {
        if (tool.parameters.length > CONFIG_LIMITS.MAX_PARAMETERS_PER_TOOL) {
          throw new ValidationError(
            `Tool "${tool.name}" has too many parameters: ${tool.parameters.length} (max ${CONFIG_LIMITS.MAX_PARAMETERS_PER_TOOL})`
          );
        }
      }
    }

    if (totalTools > CONFIG_LIMITS.MAX_TOTAL_TOOLS) {
      throw new ValidationError(
        `Too many total tools: ${totalTools} (max ${CONFIG_LIMITS.MAX_TOTAL_TOOLS})`
      );
    }

    logger.debug('[ConfigValidator] Tool counts validated', { totalTools });
  }

  /**
   * Validate URLs (HTTPS only, no localhost)
   */
  private static validateURLs(config: APIConfig): void {
    for (const api of config.apis) {
      // Only HTTPS allowed
      if (!api.baseUrl.startsWith('https://')) {
        throw new ValidationError(
          `API "${api.name}" must use HTTPS: ${api.baseUrl}`,
          { baseUrl: api.baseUrl }
        );
      }

      // Block localhost and internal IPs
      const url = new URL(api.baseUrl);
      const hostname = url.hostname.toLowerCase();

      const blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
      if (blockedHosts.includes(hostname)) {
        throw new ValidationError(`API "${api.name}" cannot use localhost: ${hostname}`);
      }

      // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      if (hostname.match(/^10\./) || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) || hostname.match(/^192\.168\./)) {
        throw new ValidationError(`API "${api.name}" cannot use private IP: ${hostname}`);
      }
    }

    logger.debug('[ConfigValidator] URL validation passed');
  }

  /**
   * Validate tool name uniqueness
   */
  private static validateToolNames(config: APIConfig): void {
    const toolNames = new Set<string>();

    for (const api of config.apis) {
      for (const tool of api.tools) {
        if (toolNames.has(tool.name)) {
          throw new ValidationError(`Duplicate tool name: "${tool.name}"`);
        }
        toolNames.add(tool.name);
      }
    }

    logger.debug('[ConfigValidator] Tool names validated', {
      uniqueTools: toolNames.size,
    });
  }
}
