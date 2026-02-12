import { join, resolve } from "node:path";

/**
 * Base directory for dyson configuration and state (per-directory)
 */
export function getDysonDir(cwdProvider: () => string = () => process.cwd()): string {
  return join(resolve(cwdProvider()), '.dyson');
}

/**
 * Path to the tasks directory
 */
export function getTasksDir(cwdProvider?: () => string): string {
  return join(getDysonDir(cwdProvider), 'tasks');
}

/**
 * Path to the task lockfile
 */
export function getTaskLockFile(cwdProvider?: () => string): string {
  return join(getTasksDir(cwdProvider), 'lockfile');
}

/**
 * Path to a task status directory
 */
export function getTaskStatusDir(status: 'open' | 'in-progress' | 'closed', cwdProvider?: () => string): string {
  return join(getTasksDir(cwdProvider), status);
}

/**
 * Path to a specific task directory
 */
export function getTaskDir(taskId: string, status: 'open' | 'in-progress' | 'closed', cwdProvider?: () => string): string {
  return join(getTaskStatusDir(status, cwdProvider), taskId);
}

/**
 * Path to a specific task file
 */
export function getTaskFile(taskId: string, status: 'open' | 'in-progress' | 'closed', cwdProvider?: () => string): string {
  return join(getTaskDir(taskId, status, cwdProvider), `${taskId}.task`);
}

/**
 * Path to sub-tasks directory within a task
 */
export function getSubtasksDir(taskId: string, status: 'open' | 'in-progress' | 'closed', cwdProvider?: () => string): string {
  return join(getTaskDir(taskId, status, cwdProvider), 'sub-tasks');
}
