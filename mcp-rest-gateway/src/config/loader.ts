/**
 * Configuration loader
 * Supports loading from:
 * 1. GATEWAY_CONFIG environment variable (MVP)
 * 2. Internal API via GATEWAY_CONFIG_ID (future)
 */

import { APIConfig } from './types.js';
import { ConfigError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ConfigLoader {
  /**
   * Load configuration from available sources
   */
  static async load(): Promise<APIConfig> {
    logger.info('[ConfigLoader] Loading configuration...');

    // Option 1: Load from GATEWAY_CONFIG JSON (MVP)
    const configJson = process.env.GATEWAY_CONFIG;
    if (configJson) {
      logger.info('[ConfigLoader] Loading from GATEWAY_CONFIG environment variable');
      return this.loadFromEnvJSON(configJson);
    }

    // Option 2: Load from internal API (future)
    const configId = process.env.GATEWAY_CONFIG_ID;
    if (configId) {
      logger.info('[ConfigLoader] Loading from PETA Core API', { configId });
      return await this.loadFromAPI(configId);
    }

    throw new ConfigError('No configuration source found. Set GATEWAY_CONFIG or GATEWAY_CONFIG_ID');
  }

  /**
   * Load configuration from JSON environment variable
   */
  private static loadFromEnvJSON(configJson: string): APIConfig {
    try {
      const parsed = JSON.parse(configJson);
      const resolved = this.resolveEnvVariables(parsed);
      logger.info('[ConfigLoader] Configuration loaded from ENV JSON');
      return resolved as APIConfig;
    } catch (error: any) {
      throw new ConfigError(`Failed to parse GATEWAY_CONFIG: ${error.message}`);
    }
  }

  /**
   * Recursively resolve environment variable placeholders ${VAR_NAME}
   */
  private static resolveEnvVariables(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{(\w+)\}/g, (_match, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new ConfigError(`Environment variable not found: ${varName}`);
        }
        return value;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveEnvVariables(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveEnvVariables(value);
      }
      return resolved;
    }

    return obj;
  }

  /**
   * Load configuration from PETA Core internal API (future implementation)
   */
  private static async loadFromAPI(_configId: string): Promise<APIConfig> {
    const internalUrl = process.env.PETA_CORE_INTERNAL_URL;
    const internalToken = process.env.PETA_CORE_INTERNAL_TOKEN;

    if (!internalUrl || !internalToken) {
      throw new ConfigError('Missing PETA_CORE_INTERNAL_URL or PETA_CORE_INTERNAL_TOKEN');
    }

    // TODO: Implement API call to PETA Core
    // const response = await fetch(`${internalUrl}/internal/gateway/config/${_configId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${internalToken}`,
    //   },
    // });

    throw new ConfigError('Internal API loading not yet implemented. Use GATEWAY_CONFIG for now.');
  }
}
