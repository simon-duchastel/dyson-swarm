/**
 * Migration from version 2 to version 3
 * 
 * This migration adds support for task dependencies by:
 * - Adding the optional 'dependsOn' field to task frontmatter
 * - No structural changes to the directory layout
 * - Existing tasks without dependencies continue to work
 * 
 * This is an additive migration - no data transformation required.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { getDysonDir, getStatusesDir } from '../../../paths.js';
import { TaskFileUtils } from '../../file-utils.js';
import type { TaskStatus } from '../../types.js';

const STATUSES: TaskStatus[] = ['draft', 'open', 'in-progress', 'closed'];

/**
 * Validate that all tasks are readable (ensures v2 structure is intact)
 */
async function validateV2Structure(cwdProvider: () => string): Promise<void> {
  const statusesDir = getStatusesDir(cwdProvider);
  
  for (const status of STATUSES) {
    const statusFile = join(statusesDir, status);
    
    if (await TaskFileUtils.fileExists(statusFile)) {
      const content = await fs.readFile(statusFile, 'utf-8');
      const taskIds = content.split('\n').filter(id => id.trim());
      
      for (const taskId of taskIds) {
        // Verify the task file exists and is readable
        const tasksDir = join(getDysonDir(cwdProvider), 'tasks');
        let taskFile: string;
        
        if (taskId.includes('/')) {
          // Subtask
          const [parentId, subtaskId] = taskId.split('/');
          taskFile = join(tasksDir, parentId, 'sub-tasks', subtaskId, `${subtaskId}.task`);
        } else {
          // Main task
          taskFile = join(tasksDir, taskId, `${taskId}.task`);
        }
        
        if (!(await TaskFileUtils.fileExists(taskFile))) {
          console.warn(`Warning: Task ${taskId} is in status file but file not found`);
        }
      }
    }
  }
}

/**
 * Migrate from version 2 to version 3
 * 
 * This is primarily a validation migration since v3 only adds an optional field.
 * No data transformation is needed.
 */
export async function migrate(cwdProvider?: () => string): Promise<void> {
  const provider = cwdProvider || (() => process.cwd());
  
  // Validate existing v2 structure
  await validateV2Structure(provider);
  
  // No transformation needed - v3 only adds optional 'dependsOn' field
  // Existing tasks without this field will continue to work
  console.log('Schema v3 migration complete: Task dependencies support added');
}

/**
 * Migration metadata
 */
export const migrationInfo = {
  fromVersion: 2,
  toVersion: 3,
  description: 'Add support for task dependencies via optional dependsOn field in frontmatter',
};
