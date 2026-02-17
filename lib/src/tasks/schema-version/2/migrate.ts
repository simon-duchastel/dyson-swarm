/**
 * Migration from version 1 to version 2
 * 
 * This migration transforms the schema from:
 *   .swarm/tasks/{status}/{id}/{id}.task
 * To:
 *   .swarm/tasks/{id}/{id}.task
 *   .swarm/statuses/{status}  (files containing sorted task IDs)
 * 
 * And adds a new 'draft' status.
 * 
 * Subtasks are now stored with fully qualified IDs: parent-id/subtask-id
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { getDysonDir } from '../../../paths.js';
import { TaskFileUtils } from '../../file-utils.js';
import type { TaskStatus } from '../../types.js';

const STATUSES: TaskStatus[] = ['open', 'in-progress', 'closed'];

/**
 * Read all tasks from v1 structure and collect their IDs by status
 */
async function collectTasksFromV1(cwdProvider: () => string): Promise<Map<TaskStatus, string[]>> {
  const tasksByStatus = new Map<TaskStatus, string[]>();
  const tasksDir = join(getDysonDir(cwdProvider), 'tasks');
  
  for (const status of STATUSES) {
    const statusDir = join(tasksDir, status);
    const taskIds: string[] = [];
    
    if (await TaskFileUtils.dirExists(statusDir)) {
      const entries = await fs.readdir(statusDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const taskId = entry.name;
          const taskFile = join(statusDir, taskId, `${taskId}.task`);
          
          if (await TaskFileUtils.fileExists(taskFile)) {
            taskIds.push(taskId);
          }
        }
      }
    }
    
    tasksByStatus.set(status, taskIds);
  }
  
  return tasksByStatus;
}

/**
 * Move a task from v1 location to v2 location
 * Updates subtasksByStatus map with subtasks organized by their status
 */
async function moveTaskToV2(
  taskId: string, 
  fromStatus: TaskStatus, 
  subtasksByStatus: Map<TaskStatus, string[]>,
  cwdProvider: () => string
): Promise<void> {
  const tasksDir = join(getDysonDir(cwdProvider), 'tasks');
  const v1TaskDir = join(tasksDir, fromStatus, taskId);
  const v2TaskDir = join(tasksDir, taskId);
  const v1TaskFile = join(v1TaskDir, `${taskId}.task`);
  const v2TaskFile = join(v2TaskDir, `${taskId}.task`);
  
  // Ensure v2 task directory exists
  await TaskFileUtils.ensureDir(v2TaskDir);
  
  // Move main task file
  await fs.rename(v1TaskFile, v2TaskFile);
  
  // Move subtasks with fully qualified IDs
  const v1SubtasksDir = join(v1TaskDir, 'sub-tasks');
  const v2SubtasksDir = join(v2TaskDir, 'sub-tasks');
  
  if (await TaskFileUtils.dirExists(v1SubtasksDir)) {
    await TaskFileUtils.ensureDir(v2SubtasksDir);
    
    for (const status of STATUSES) {
      const v1StatusDir = join(v1SubtasksDir, status);
      
      if (await TaskFileUtils.dirExists(v1StatusDir)) {
        const entries = await fs.readdir(v1StatusDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.task')) {
            const subtaskId = entry.name.replace('.task', '');
            const v1SubtaskFile = join(v1StatusDir, entry.name);
            const v2SubtaskDir = join(v2SubtasksDir, subtaskId);
            const v2SubtaskFile = join(v2SubtaskDir, `${subtaskId}.task`);
            
            await TaskFileUtils.ensureDir(v2SubtaskDir);
            await fs.rename(v1SubtaskFile, v2SubtaskFile);
            
            // Add to subtasks map by status
            const subtasks = subtasksByStatus.get(status) || [];
            subtasks.push(`${taskId}/${subtaskId}`);
            subtasksByStatus.set(status, subtasks);
          }
        }
        
        // Remove empty v1 status directory
        await fs.rmdir(v1StatusDir).catch(() => {});
      }
    }
    
    // Remove empty v1 subtasks directory
    await fs.rmdir(v1SubtasksDir).catch(() => {});
  }
  
  // Remove empty v1 task directory
  await fs.rmdir(v1TaskDir).catch(() => {});
}

/**
 * Create status files in v2 format (sorted task IDs)
 * Now includes both main tasks and subtasks
 */
async function createStatusFiles(
  tasksByStatus: Map<TaskStatus, string[]>,
  subtasksByStatus: Map<TaskStatus, string[]>,
  cwdProvider: () => string
): Promise<void> {
  const dysonDir = getDysonDir(cwdProvider);
  const statusesDir = join(dysonDir, 'statuses');
  
  await TaskFileUtils.ensureDir(statusesDir);
  
  // Create status files for each status
  for (const status of [...STATUSES, 'draft'] as TaskStatus[]) {
    const mainTaskIds = tasksByStatus.get(status) || [];
    const subtaskIds = subtasksByStatus.get(status) || [];
    
    // Combine and sort lexicographically
    const allIds = [...mainTaskIds, ...subtaskIds].sort();
    const statusFile = join(statusesDir, status);
    
    if (allIds.length > 0) {
      await fs.writeFile(statusFile, allIds.join('\n') + '\n', 'utf-8');
    } else {
      await fs.writeFile(statusFile, '', 'utf-8');
    }
  }
}

/**
 * Remove empty v1 status directories
 */
async function cleanupV1Structure(cwdProvider: () => string): Promise<void> {
  const tasksDir = join(getDysonDir(cwdProvider), 'tasks');
  
  for (const status of STATUSES) {
    const statusDir = join(tasksDir, status);
    if (await TaskFileUtils.dirExists(statusDir)) {
      await fs.rmdir(statusDir).catch(() => {});
    }
  }
}

/**
 * Migrate from version 1 to version 2
 */
export async function migrate(cwdProvider?: () => string): Promise<void> {
  const provider = cwdProvider || (() => process.cwd());
  const tasksDir = join(getDysonDir(provider), 'tasks');
  
  // Check if v1 structure exists
  let hasV1Structure = false;
  for (const status of STATUSES) {
    const statusDir = join(tasksDir, status);
    if (await TaskFileUtils.dirExists(statusDir)) {
      hasV1Structure = true;
      break;
    }
  }
  
  if (!hasV1Structure) {
    // No v1 data to migrate, just create empty v2 structure
    const statusesDir = join(getDysonDir(provider), 'statuses');
    await TaskFileUtils.ensureDir(statusesDir);
    
    for (const status of [...STATUSES, 'draft'] as TaskStatus[]) {
      const statusFile = join(statusesDir, status);
      if (!(await TaskFileUtils.fileExists(statusFile))) {
        await fs.writeFile(statusFile, '', 'utf-8');
      }
    }
    return;
  }
  
  // Collect all tasks from v1 structure
  const tasksByStatus = await collectTasksFromV1(provider);
  const subtasksByStatus = new Map<TaskStatus, string[]>();
  
  // Initialize subtasks map
  for (const status of STATUSES) {
    subtasksByStatus.set(status, []);
  }
  
  // Move each task to v2 structure
  for (const [status, taskIds] of tasksByStatus) {
    for (const taskId of taskIds) {
      await moveTaskToV2(taskId, status, subtasksByStatus, provider);
    }
  }
  
  // Create status files
  await createStatusFiles(tasksByStatus, subtasksByStatus, provider);
  
  // Clean up v1 structure
  await cleanupV1Structure(provider);
}

/**
 * Migration metadata
 */
export const migrationInfo = {
  fromVersion: 1,
  toVersion: 2,
  description: 'Move tasks to flat structure with separate status files, add draft status, use fully qualified subtask IDs',
};
