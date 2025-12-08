/**
 * Response transformer
 * Transforms REST API responses using JSONPath and templates
 */

import { ResponseTransform, CONFIG_LIMITS } from '../config/types.js';
import { logger } from '../utils/logger.js';

export class ResponseTransformer {
  /**
   * Transform response data
   */
  static transform(data: any, transform?: ResponseTransform): any {
    if (!transform) {
      return data;
    }

    let result = data;

    switch (transform.type) {
      case 'json':
        result = this.transformJSON(data, transform);
        break;

      case 'text':
        result = String(data);
        break;

      case 'raw':
      default:
        result = data;
        break;
    }

    // Apply truncation if specified
    if (transform.truncate) {
      result = this.truncateResponse(result, transform.truncate);
    }

    return result;
  }

  /**
   * Transform JSON response
   */
  private static transformJSON(data: any, transform: ResponseTransform): any {
    let result = data;

    // Apply JSONPath
    if (transform.jsonPath) {
      result = this.applyJSONPath(data, transform.jsonPath);
    }

    // Apply template
    if (transform.template) {
      result = this.applyTemplate(result, transform.template);
    }

    return result;
  }

  /**
   * Simple JSONPath implementation
   * Supports: $.field, $.field.subfield, $.array[0], $.array[*]
   */
  static applyJSONPath(data: any, path: string): any {
    if (!path || path === '$') {
      return data;
    }

    // Remove leading $. or $
    const cleanPath = path.replace(/^\$\.?/, '');

    if (!cleanPath) {
      return data;
    }

    const parts = cleanPath.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }

      // Handle array wildcard: array[*]
      if (part.endsWith('[*]')) {
        const fieldName = part.replace('[*]', '');
        current = current[fieldName];
        if (!Array.isArray(current)) {
          return null;
        }
        // Continue processing with array
        continue;
      }

      // Handle array index: array[0]
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, name, index] = arrayMatch;
        current = current[name];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return null;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Apply template (simple {{field}} syntax)
   */
  private static applyTemplate(data: any, template: string): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
      const value = this.applyJSONPath(data, path.trim());
      return value !== null && value !== undefined ? String(value) : '';
    });
  }

  /**
   * Extract error message from response
   */
  static extractError(error: any, errorPath?: string): string {
    // Try custom error path
    if (errorPath && error.response?.data) {
      const errorMsg = this.applyJSONPath(error.response.data, errorPath);
      if (errorMsg) {
        return String(errorMsg);
      }
    }

    // Common error paths
    if (error.response?.data?.message) {
      return String(error.response.data.message);
    }

    if (error.response?.data?.error) {
      return String(error.response.data.error);
    }

    if (error.message) {
      return error.message;
    }

    return 'Unknown error';
  }

  /**
   * Truncate response if too large
   */
  private static truncateResponse(data: any, maxSize: number): any {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    if (jsonString.length <= maxSize) {
      return data;
    }

    const truncated = jsonString.substring(0, maxSize);
    const suffix = `\n\n[Response truncated: ${jsonString.length} bytes, showing first ${maxSize} bytes]`;

    logger.warn('[ResponseTransformer] Response truncated', {
      originalSize: jsonString.length,
      truncatedSize: maxSize,
    });

    return truncated + suffix;
  }

  /**
   * Enforce maximum response size
   */
  static enforceMaxSize(data: any): any {
    return this.truncateResponse(data, CONFIG_LIMITS.MAX_RESPONSE_SIZE);
  }
}
