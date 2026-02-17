import { join, resolve } from "node:path";

/**
 * Base directory for swarm configuration and state (per-directory)
 */
export function getDysonDir(cwdProvider: () => string = () => process.cwd()): string {
  return join(resolve(cwdProvider()), '.swarm');
}

/**
 * Path to the lockfile (moved to root in v2)
 */
export function getLockfilePath(cwdProvider?: () => string): string {
  return join(getDysonDir(cwdProvider), 'lockfile');
}

/**
 * Path to the statuses directory (new in v2)
 */
export function getStatusesDir(cwdProvider?: () => string): string {
  return join(getDysonDir(cwdProvider), 'statuses');
}

/**
 * Path to a specific status file (new in v2)
 * Contains sorted list of task IDs
 */
export function getStatusFile(status: 'draft' | 'open' | 'in-progress' | 'closed', cwdProvider?: () => string): string {
  return join(getStatusesDir(cwdProvider), status);
}

/**
 * Path to the tasks directory (flat structure in v2)
 */
export function getTasksDir(cwdProvider?: () => string): string {
  return join(getDysonDir(cwdProvider), 'tasks');
}

/**
 * Path to a specific task directory (flat in v2, no status in path)
 */
export function getTaskDir(taskId: string, cwdProvider?: () => string): string {
  return join(getTasksDir(cwdProvider), taskId);
}

/**
 * Path to a specific task file (flat in v2, no status in path)
 */
export function getTaskFile(taskId: string, cwdProvider?: () => string): string {
  return join(getTaskDir(taskId, cwdProvider), `${taskId}.task`);
}

/**
 * Path to sub-tasks directory within a task
 */
export function getSubtasksDir(taskId: string, cwdProvider?: () => string): string {
  if (taskId.includes('/')) {
    return join(getSubtaskDir(taskId, cwdProvider), 'sub-tasks');
  }
  return join(getTaskDir(taskId, cwdProvider), 'sub-tasks');
}

/**
 * Path to a specific subtask directory
 * Uses fully qualified ID: parentId/subtaskId or nested: grandParentId/parentId/subtaskId
 */
export function getSubtaskDir(fullyQualifiedId: string, cwdProvider?: () => string): string {
  const parts = fullyQualifiedId.split('/');
  const subtaskId = parts[parts.length - 1];
  const parentId = parts.slice(0, -1).join('/');
  
  return join(getSubtasksDir(parentId, cwdProvider), subtaskId);
}

/**
 * Path to a specific subtask file
 * Uses fully qualified ID: parentId/subtaskId or nested: grandParentId/parentId/subtaskId
 */
export function getSubtaskFile(fullyQualifiedId: string, cwdProvider?: () => string): string {
  const parts = fullyQualifiedId.split('/');
  const subtaskId = parts[parts.length - 1];
  return join(getSubtaskDir(fullyQualifiedId, cwdProvider), `${subtaskId}.task`);
}

// Deprecated v1 functions - kept for reference but not used in v2
/**
 * @deprecated Use getLockfilePath instead (moved to root in v2)
 */
export function getTaskLockFile(cwdProvider?: () => string): string {
  return getLockfilePath(cwdProvider);
}

/**
 * @deprecated v2 uses flat task structure - status is tracked in status files
 */
export function getTaskStatusDir(_status: string, cwdProvider?: () => string): string {
  return getTasksDir(cwdProvider);
}
