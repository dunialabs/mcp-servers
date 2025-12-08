/**
 * Google Drive Change Monitor
 *
 * Monitors Google Drive for file/folder changes and notifies peta-core via MCP protocol.
 * Implements intelligent polling with adaptive intervals based on activity.
 */

import { drive_v3 } from 'googleapis';
import { getDriveClient } from '../tools/common.js';
import { logger } from '../utils/logger.js';

/**
 * Change monitoring configuration
 */
export interface ChangeMonitorConfig {
  /** Enable change monitoring (default: true, enabled) */
  enabled?: boolean;

  /** Initial polling interval in milliseconds (default: 30000 = 30s) */
  initialInterval?: number;

  /** Minimum polling interval when active (default: 15000 = 15s) */
  minInterval?: number;

  /** Maximum polling interval when idle (default: 300000 = 5min) */
  maxInterval?: number;

  /** Time to wait before increasing interval after no changes (default: 60000 = 1min) */
  idleThreshold?: number;
}

/**
 * Change types detected
 */
export enum ChangeType {
  FILE_ADDED = 'file_added',
  FILE_MODIFIED = 'file_modified',
  FILE_REMOVED = 'file_removed',
  FILE_RESTORED = 'file_restored',
}

/**
 * Change event
 */
export interface ChangeEvent {
  type: ChangeType;
  fileId: string;
  fileName?: string;
  mimeType?: string;
  timestamp: Date;
}

/**
 * Change Monitor for Google Drive
 *
 * Features:
 * - Polls Google Drive Changes API to detect file/folder changes
 * - Adaptive polling interval (faster when active, slower when idle)
 * - Notifies via callback when changes are detected
 * - Handles errors gracefully with exponential backoff
 */
export class ChangeMonitor {
  private drive: drive_v3.Drive;
  private pageToken: string | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private currentInterval: number;
  private lastChangeTime: number = 0;
  private isRunning: boolean = false;
  private consecutiveErrors: number = 0;

  private config: Required<ChangeMonitorConfig>;
  private onChangeCallback: (changes: ChangeEvent[]) => void;

  constructor(
    config: ChangeMonitorConfig,
    onChangeCallback: (changes: ChangeEvent[]) => void
  ) {
    this.drive = getDriveClient();
    this.onChangeCallback = onChangeCallback;

    // Merge config with defaults (using only config params, no env vars)
    this.config = {
      enabled: config.enabled ?? true, // Default: enabled
      initialInterval: config.initialInterval ?? 30000, // Default: 30s
      minInterval: config.minInterval ?? 15000, // Default: 15s
      maxInterval: config.maxInterval ?? 300000, // Default: 5min
      idleThreshold: config.idleThreshold ?? 60000, // Default: 1min
    };

    this.currentInterval = this.config.initialInterval;

    logger.info('[ChangeMonitor] Initialized', {
      enabled: this.config.enabled,
      initialInterval: this.config.initialInterval,
      minInterval: this.config.minInterval,
      maxInterval: this.config.maxInterval,
    });
  }

  /**
   * Start monitoring for changes
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('[ChangeMonitor] Change monitoring is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('[ChangeMonitor] Already running');
      return;
    }

    try {
      // Get initial page token (start from now)
      logger.info('[ChangeMonitor] Getting initial page token...');
      const response = await this.drive.changes.getStartPageToken();
      this.pageToken = response.data.startPageToken || null;

      if (!this.pageToken) {
        throw new Error('Failed to get initial page token');
      }

      logger.info('[ChangeMonitor] Started monitoring', {
        pageToken: this.pageToken,
        interval: this.currentInterval
      });

      this.isRunning = true;
      this.lastChangeTime = Date.now();

      // Start polling
      this.scheduleNextPoll();

    } catch (error) {
      logger.error('[ChangeMonitor] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.isRunning = false;
    logger.info('[ChangeMonitor] Stopped monitoring');
  }

  /**
   * Check for changes (single poll)
   */
  private async checkForChanges(): Promise<void> {
    if (!this.pageToken) {
      logger.error('[ChangeMonitor] No page token available');
      return;
    }

    try {
      // Query changes since last pageToken
      const response = await this.drive.changes.list({
        pageToken: this.pageToken,
        pageSize: 100,
        fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, trashed, modifiedTime))',
      });

      const changes = response.data.changes || [];
      const hasChanges = changes.length > 0;

      if (hasChanges) {
        logger.info('[ChangeMonitor] Detected changes', { count: changes.length });

        // Process changes
        const changeEvents = this.processChanges(changes);

        // Notify callback
        if (changeEvents.length > 0) {
          this.onChangeCallback(changeEvents);
        }

        // Update last change time
        this.lastChangeTime = Date.now();

        // Reset to minimum interval (active state)
        this.currentInterval = this.config.minInterval;

        // Reset error counter
        this.consecutiveErrors = 0;
      } else {
        // No changes - gradually increase interval (idle state)
        this.adjustIntervalForIdle();
      }

      // Update page token for next poll
      // Use newStartPageToken if available (indicates end of change list)
      // Otherwise use nextPageToken (indicates more pages available)
      if (response.data.newStartPageToken) {
        this.pageToken = response.data.newStartPageToken;
      } else if (response.data.nextPageToken) {
        this.pageToken = response.data.nextPageToken;
      }

    } catch (error: any) {
      this.consecutiveErrors++;

      logger.error('[ChangeMonitor] Error checking changes:', {
        error: error.message,
        consecutiveErrors: this.consecutiveErrors,
      });

      // Apply exponential backoff for errors
      this.applyErrorBackoff();
    }
  }

  /**
   * Process raw changes into ChangeEvents
   */
  private processChanges(changes: drive_v3.Schema$Change[]): ChangeEvent[] {
    const events: ChangeEvent[] = [];

    for (const change of changes) {
      const fileId = change.fileId;
      if (!fileId) continue;

      const file = change.file;
      const removed = change.removed === true;

      let type: ChangeType;

      if (removed) {
        type = ChangeType.FILE_REMOVED;
      } else if (file?.trashed) {
        type = ChangeType.FILE_REMOVED;
      } else {
        // Check if file is new or modified (we can't easily distinguish without keeping history)
        // For simplicity, treat all non-removed changes as modifications
        type = ChangeType.FILE_MODIFIED;
      }

      events.push({
        type,
        fileId,
        fileName: file?.name ?? undefined,
        mimeType: file?.mimeType ?? undefined,
        timestamp: file?.modifiedTime ? new Date(file.modifiedTime) : new Date(),
      });
    }

    return events;
  }

  /**
   * Adjust polling interval when idle (no changes detected)
   */
  private adjustIntervalForIdle(): void {
    const timeSinceLastChange = Date.now() - this.lastChangeTime;

    if (timeSinceLastChange > this.config.idleThreshold) {
      // Gradually increase interval (up to maxInterval)
      const newInterval = Math.min(
        this.currentInterval * 1.5, // Increase by 50%
        this.config.maxInterval
      );

      if (newInterval !== this.currentInterval) {
        logger.debug('[ChangeMonitor] Increasing poll interval (idle)', {
          from: this.currentInterval,
          to: newInterval,
          timeSinceLastChange,
        });
        this.currentInterval = newInterval;
      }
    }
  }

  /**
   * Apply exponential backoff when errors occur
   */
  private applyErrorBackoff(): void {
    // Exponential backoff: 2^n * baseInterval, capped at maxInterval
    const backoffMultiplier = Math.min(Math.pow(2, this.consecutiveErrors), 10);
    const backoffInterval = Math.min(
      this.config.initialInterval * backoffMultiplier,
      this.config.maxInterval
    );

    logger.warn('[ChangeMonitor] Applying error backoff', {
      consecutiveErrors: this.consecutiveErrors,
      backoffInterval,
    });

    this.currentInterval = backoffInterval;
  }

  /**
   * Schedule next poll
   */
  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    this.pollingTimer = setTimeout(async () => {
      await this.checkForChanges();
      this.scheduleNextPoll(); // Schedule next poll after current one completes
    }, this.currentInterval);
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      currentInterval: this.currentInterval,
      pageToken: this.pageToken ?? undefined,
      lastChangeTime: this.lastChangeTime,
      timeSinceLastChange: this.lastChangeTime ? Date.now() - this.lastChangeTime : undefined,
      consecutiveErrors: this.consecutiveErrors,
    };
  }
}
