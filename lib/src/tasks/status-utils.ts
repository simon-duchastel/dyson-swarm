/**
 * Status file utilities for v2 schema
 * 
 * Provides atomic operations for managing task status files.
 * Each status file contains a sorted list of task IDs (one per line).
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { getStatusFile } from '../paths.js';
import { TaskFileUtils } from './file-utils.js';
import type { TaskStatus } from './types.js';

export class StatusUtils {
  /**
   * Read a status file and return sorted array of task IDs
   */
  static async readStatusFile(
    status: TaskStatus,
    cwdProvider?: () => string
  ): Promise<string[]> {
    const statusFile = getStatusFile(status, cwdProvider);
    
    if (!(await TaskFileUtils.fileExists(statusFile))) {
      return [];
    }
    
    const content = await fs.readFile(statusFile, 'utf-8');
    const ids = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Ensure sorted (defensive)
    return ids.sort();
  }

  /**
   * Write a status file with sorted task IDs (atomic operation)
   * Uses write-to-temp-then-rename pattern for atomicity
   */
  static async writeStatusFile(
    status: TaskStatus,
    taskIds: string[],
    cwdProvider?: () => string
  ): Promise<void> {
    const statusFile = getStatusFile(status, cwdProvider);
    
    // Ensure statuses directory exists
    await TaskFileUtils.ensureDir(dirname(statusFile));
    
    // Sort lexicographically
    const sortedIds = [...taskIds].sort();
    const content = sortedIds.length > 0 ? sortedIds.join('\n') + '\n' : '';
    
    // Atomic write: write to temp file, then rename
    const tempFile = `${statusFile}.tmp`;
    await fs.writeFile(tempFile, content, 'utf-8');
    await fs.rename(tempFile, statusFile);
  }

  /**
   * Add a task ID to a status file (atomic operation)
   * Returns true if added, false if already exists
   */
  static async addTaskToStatus(
    taskId: string,
    status: TaskStatus,
    cwdProvider?: () => string
  ): Promise<boolean> {
    const currentIds = await this.readStatusFile(status, cwdProvider);
    
    // Check if already exists
    if (currentIds.includes(taskId)) {
      return false;
    }
    
    // Add and write atomically
    const newIds = [...currentIds, taskId];
    await this.writeStatusFile(status, newIds, cwdProvider);
    return true;
  }

  /**
   * Remove a task ID from a status file (atomic operation)
   * Returns true if removed, false if not found
   */
  static async removeTaskFromStatus(
    taskId: string,
    status: TaskStatus,
    cwdProvider?: () => string
  ): Promise<boolean> {
    const currentIds = await this.readStatusFile(status, cwdProvider);
    
    // Check if exists
    const index = currentIds.indexOf(taskId);
    if (index === -1) {
      return false;
    }
    
    // Remove and write atomically
    const newIds = [...currentIds.slice(0, index), ...currentIds.slice(index + 1)];
    await this.writeStatusFile(status, newIds, cwdProvider);
    return true;
  }

  /**
   * Move a task from one status to another (atomic operation)
   * Ensures the task is removed from old status and added to new status
   * Returns true if successful
   */
  static async moveTaskStatus(
    taskId: string,
    fromStatus: TaskStatus | null,
    toStatus: TaskStatus,
    cwdProvider?: () => string
  ): Promise<boolean> {
    // Remove from old status if specified
    if (fromStatus !== null) {
      await this.removeTaskFromStatus(taskId, fromStatus, cwdProvider);
    }
    
    // Add to new status
    await this.addTaskToStatus(taskId, toStatus, cwdProvider);
    return true;
  }

  /**
   * Find which status a task is currently in
   * Returns null if task not found in any status
   */
  static async findTaskStatus(
    taskId: string,
    cwdProvider?: () => string
  ): Promise<TaskStatus | null> {
    const statuses: TaskStatus[] = ['draft', 'open', 'in-progress', 'closed'];
    
    for (const status of statuses) {
      const ids = await this.readStatusFile(status, cwdProvider);
      if (ids.includes(taskId)) {
        return status;
      }
    }
    
    return null;
  }

  /**
   * Get all task IDs across all statuses
   */
  static async getAllTaskIds(
    cwdProvider?: () => string
  ): Promise<Map<TaskStatus, string[]>> {
    const statuses: TaskStatus[] = ['draft', 'open', 'in-progress', 'closed'];
    const result = new Map<TaskStatus, string[]>();
    
    for (const status of statuses) {
      const ids = await this.readStatusFile(status, cwdProvider);
      result.set(status, ids);
    }
    
    return result;
  }

  /**
   * Initialize all status files (creates empty files if they don't exist)
   */
  static async initializeStatusFiles(
    cwdProvider?: () => string
  ): Promise<void> {
    const statuses: TaskStatus[] = ['draft', 'open', 'in-progress', 'closed'];
    
    for (const status of statuses) {
      const statusFile = getStatusFile(status, cwdProvider);
      
      if (!(await TaskFileUtils.fileExists(statusFile))) {
        await TaskFileUtils.ensureDir(dirname(statusFile));
        await fs.writeFile(statusFile, '', 'utf-8');
      }
    }
  }

  /**
   * Validate that a task ID doesn't exist in multiple statuses
   * Returns array of violations (should be empty for valid state)
   */
  static async validateNoDuplicateTasks(
    cwdProvider?: () => string
  ): Promise<{ taskId: string; statuses: TaskStatus[] }[]> {
    const allIds = await this.getAllTaskIds(cwdProvider);
    const taskToStatuses = new Map<string, TaskStatus[]>();
    
    // Build map of task ID to statuses
    for (const [status, ids] of allIds) {
      for (const taskId of ids) {
        const statuses = taskToStatuses.get(taskId) || [];
        statuses.push(status);
        taskToStatuses.set(taskId, statuses);
      }
    }
    
    // Find any tasks in multiple statuses
    const violations: { taskId: string; statuses: TaskStatus[] }[] = [];
    for (const [taskId, statuses] of taskToStatuses) {
      if (statuses.length > 1) {
        violations.push({ taskId, statuses });
      }
    }
    
    return violations;
  }
}
