/**
 * Schema Version Management
 * =========================
 * 
 * This file manages the schema version for the .swarm directory structure.
 * The version file is stored at `.swarm/version` and tracks the current
 * schema version to enable future migrations.
 * 
 * Current Version: 1
 * 
 * Schema Versions Explainer
 * -------------------------
 * 
 * ### Version 1 (Initial)
 * Directory structure:
 *   .swarm/
 *   └── tasks/
 *       ├── lockfile
 *       ├── open/
 *       │   └── {task-id}/
 *       │       ├── {task-id}.task
 *       │       └── sub-tasks/
 *       │           └── open/
 *       │               └── {subtask-id}.task
 *       ├── in-progress/
 *       │   └── {task-id}/
 *       │       ├── {task-id}.task
 *       │       └── sub-tasks/
 *       │           └── in-progress/
 *       │               └── {subtask-id}.task
 *       └── closed/
 *           └── {task-id}/
 *               ├── {task-id}.task
 *               └── sub-tasks/
 *                   └── closed/
 *                       └── {subtask-id}.task
 * 
 * Task file format (YAML frontmatter + markdown):
 *   ---
 *   title: "Task Title"
 *   assignee: "username"  # Optional
 *   ---
 *   Task description goes here...
 * 
 * 
 * Migration Guide
 * ---------------
 * When adding a new schema version:
 * 
 * 1. Update CURRENT_SCHEMA_VERSION constant below
 * 2. Add migration logic in migrateToLatest() function
 * 3. Document the changes in this header comment
 * 4. Update the "Current Version" in the header above
 * 
 * Example migration pattern:
 *   if (currentVersion < 2) {
 *     // Perform migration from v1 to v2
 *     // - Rename files
 *     // - Restructure directories
 *     // - Transform data formats
 *   }
 *   if (currentVersion < 3) {
 *     // Perform migration from v2 to v3
 *   }
 * 
 * Migration Best Practices:
 * - Always make migrations idempotent (safe to run multiple times)
 * - Create backups before destructive operations
 * - Validate the migration succeeded before updating version
 * - Log all migration steps for debugging
 */

import { promises as fs } from 'fs';
import { getDysonDir } from '../paths.js';
import { TaskFileUtils } from './file-utils.js';

/**
 * Current schema version
 * Increment this when making breaking changes to the directory structure
 * or task file format
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Schema version file name
 */
export const VERSION_FILE_NAME = 'version';

/**
 * Get the full path to the version file
 */
export function getVersionFilePath(cwdProvider: () => string = () => process.cwd()): string {
  return `${getDysonDir(cwdProvider)}/${VERSION_FILE_NAME}`;
}

/**
 * Read the current schema version from disk
 * Returns 0 if no version file exists (pre-versioning)
 */
export async function readSchemaVersion(cwdProvider?: () => string): Promise<number> {
  const versionFile = getVersionFilePath(cwdProvider);
  
  if (!(await TaskFileUtils.fileExists(versionFile))) {
    return 0;
  }
  
  try {
    const content = await fs.readFile(versionFile, 'utf-8');
    const version = parseInt(content.trim(), 10);
    return isNaN(version) ? 0 : version;
  } catch {
    return 0;
  }
}

/**
 * Write the schema version to disk
 */
export async function writeSchemaVersion(version: number, cwdProvider?: () => string): Promise<void> {
  const versionFile = getVersionFilePath(cwdProvider);
  await fs.writeFile(versionFile, version.toString(), 'utf-8');
}

/**
 * Initialize the schema version file
 * Called when setting up a new .swarm directory
 */
export async function initializeSchemaVersion(cwdProvider?: () => string): Promise<void> {
  await writeSchemaVersion(CURRENT_SCHEMA_VERSION, cwdProvider);
}

/**
 * Migrate from an older schema version to the latest
 * Add migration logic here when introducing new schema versions
 */
export async function migrateToLatest(
  currentVersion: number,
  cwdProvider?: () => string
): Promise<void> {
  // No migrations needed for version 1 (initial version)
  // Add migration steps here for future versions:
  //
  // if (currentVersion < 2) {
  //   await migrateV1ToV2(cwdProvider);
  // }
  // if (currentVersion < 3) {
  //   await migrateV2ToV3(cwdProvider);
  // }
  
  // Update to latest version
  await writeSchemaVersion(CURRENT_SCHEMA_VERSION, cwdProvider);
}

/**
 * Ensure the schema is up to date
 * Checks version and runs migrations if needed
 * @throws Error if migration fails
 */
export async function ensureSchemaVersion(cwdProvider?: () => string): Promise<void> {
  const currentVersion = await readSchemaVersion(cwdProvider);
  
  if (currentVersion === 0) {
    // New installation, initialize with current version
    await initializeSchemaVersion(cwdProvider);
  } else if (currentVersion < CURRENT_SCHEMA_VERSION) {
    // Migration needed
    await migrateToLatest(currentVersion, cwdProvider);
  } else if (currentVersion > CURRENT_SCHEMA_VERSION) {
    // Downgrade not supported
    throw new Error(
      `Schema version ${currentVersion} is newer than supported version ${CURRENT_SCHEMA_VERSION}. ` +
      'Please upgrade your dyson-swarm installation.'
    );
  }
  // If currentVersion === CURRENT_SCHEMA_VERSION, nothing to do
}

/**
 * Validate that the schema version is compatible
 * Returns true if compatible, false otherwise
 */
export async function isSchemaCompatible(cwdProvider?: () => string): Promise<boolean> {
  try {
    await ensureSchemaVersion(cwdProvider);
    return true;
  } catch {
    return false;
  }
}
