import { promises as fs } from 'fs';
import { getDysonDir, getTasksDir, getStatusesDir, getLockfilePath } from './paths.js';
import { TaskFileUtils } from './tasks/file-utils.js';
import { CURRENT_SCHEMA_VERSION, getVersionFilePath } from './tasks/schema-version/index.js';
import type { TaskStatus } from './tasks/types.js';

/**
 * Error thrown when the directory is not initialized for dyson-swarm
 */
export class NotInitializedError extends Error {
  constructor(
    message: string = 'This directory is not initialized for dyson-swarm. Run "swarm init" to initialize.',
    public missingComponents: string[] = []
  ) {
    super(message);
    this.name = 'NotInitializedError';
  }
}

/**
 * Check if the current directory is initialized for dyson-swarm
 * Returns an object with isInitialized flag and missingComponents list
 */
export async function checkInitialization(
  cwdProvider: () => string = () => process.cwd()
): Promise<{
  isInitialized: boolean;
  missingComponents: string[];
}> {
  const missingComponents: string[] = [];

  // Check for .swarm directory
  const dysonDir = getDysonDir(cwdProvider);
  if (!(await TaskFileUtils.dirExists(dysonDir))) {
    missingComponents.push('.swarm directory');
    return { isInitialized: false, missingComponents };
  }

  // Check for version file
  const versionFile = getVersionFilePath(cwdProvider);
  if (!(await TaskFileUtils.fileExists(versionFile))) {
    missingComponents.push('version file');
  } else {
    try {
      const content = await fs.readFile(versionFile, 'utf-8');
      const version = parseInt(content.trim(), 10);
      if (isNaN(version)) {
        missingComponents.push('valid version file');
      }
    } catch {
      missingComponents.push('readable version file');
    }
  }

  // Check for tasks directory
  const tasksDir = getTasksDir(cwdProvider);
  if (!(await TaskFileUtils.dirExists(tasksDir))) {
    missingComponents.push('tasks directory');
  }

  // Check for statuses directory and status files
  const statusesDir = getStatusesDir(cwdProvider);
  if (!(await TaskFileUtils.dirExists(statusesDir))) {
    missingComponents.push('statuses directory');
  } else {
    const statuses: TaskStatus[] = ['draft', 'open', 'in-progress', 'closed'];
    for (const status of statuses) {
      const statusFilePath = `${statusesDir}/${status}`;
      if (!(await TaskFileUtils.fileExists(statusFilePath))) {
        missingComponents.push(`status file: ${status}`);
      }
    }
  }

  // Check for lockfile
  const lockfilePath = getLockfilePath(cwdProvider);
  if (!(await TaskFileUtils.fileExists(lockfilePath))) {
    missingComponents.push('lockfile');
  }

  return {
    isInitialized: missingComponents.length === 0,
    missingComponents,
  };
}

/**
 * Check if the current directory is initialized (convenience function)
 */
export async function isInitialized(
  cwdProvider?: () => string
): Promise<boolean> {
  const result = await checkInitialization(cwdProvider);
  return result.isInitialized;
}

/**
 * Initialize dyson-swarm in the current directory
 * Creates the .swarm directory structure with all required files
 * @throws Error if already initialized
 */
export async function initialize(
  cwdProvider: () => string = () => process.cwd()
): Promise<void> {
  const { isInitialized: alreadyInitialized } = await checkInitialization(cwdProvider);

  if (alreadyInitialized) {
    throw new Error(
      'This directory is already initialized for dyson-swarm. ' +
      'If you want to reinitialize, remove the .swarm directory first.'
    );
  }

  const dysonDir = getDysonDir(cwdProvider);
  const tasksDir = getTasksDir(cwdProvider);
  const statusesDir = getStatusesDir(cwdProvider);
  const lockfilePath = getLockfilePath(cwdProvider);
  const versionFile = getVersionFilePath(cwdProvider);

  // Create .swarm directory
  await TaskFileUtils.ensureDir(dysonDir);

  // Create version file with current schema version
  await fs.writeFile(versionFile, CURRENT_SCHEMA_VERSION.toString(), 'utf-8');

  // Create tasks directory
  await TaskFileUtils.ensureDir(tasksDir);

  // Create statuses directory and status files
  await TaskFileUtils.ensureDir(statusesDir);
  const statuses: TaskStatus[] = ['draft', 'open', 'in-progress', 'closed'];
  for (const status of statuses) {
    const statusFilePath = `${statusesDir}/${status}`;
    await fs.writeFile(statusFilePath, '', 'utf-8');
  }

  // Create lockfile
  await fs.writeFile(lockfilePath, '', 'utf-8');
}

/**
 * Initialize dyson-swarm forcefully (removes existing .swarm if present)
 * Use with caution - this will delete all existing tasks!
 */
export async function initializeForce(
  cwdProvider: () => string = () => process.cwd()
): Promise<void> {
  const dysonDir = getDysonDir(cwdProvider);

  // Remove existing .swarm directory if it exists
  if (await TaskFileUtils.dirExists(dysonDir)) {
    await fs.rm(dysonDir, { recursive: true, force: true });
  }

  // Initialize fresh
  await initialize(cwdProvider);
}
