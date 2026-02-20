/**
 * Schema Version Management
 * 
 * This module manages the schema version for the .swarm directory structure.
 * The version file is stored at `.swarm/version` and tracks the current
 * schema version to enable future migrations.
 * 
 * Each schema version has its own folder in schema-version/{version}/ containing:
 * - README.md: Documentation of that version's structure and format
 * - migrate.ts: Migration script to upgrade from the previous version
 * 
 * @see schema-version/1/README.md for the initial version documentation
 */

import { promises as fs } from 'fs';
import { getDysonDir } from '../../paths.js';
import { TaskFileUtils } from '../file-utils.js';

/**
 * Current schema version
 * Increment this when making breaking changes to the directory structure
 * or task file format
 */
export const CURRENT_SCHEMA_VERSION = 3;

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
 * Import migration module for a specific version
 */
async function importMigration(version: number): Promise<{ migrate: (cwdProvider?: () => string) => Promise<void> } | null> {
  try {
    // Dynamic import of migration module
    const migrationModule = await import(`./${version}/migrate.js`);
    return migrationModule;
  } catch {
    // Migration module doesn't exist for this version
    return null;
  }
}

/**
 * Migrate from an older schema version to the latest
 * Imports and runs migration scripts from schema-version/{version}/migrate.ts
 */
export async function migrateToLatest(
  currentVersion: number,
  cwdProvider?: () => string
): Promise<void> {
  // Run migrations sequentially from currentVersion to CURRENT_SCHEMA_VERSION
  for (let version = currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version++) {
    const migration = await importMigration(version);
    
    if (migration) {
      await migration.migrate(cwdProvider);
    }
    // If no migration module exists, assume it's a no-op (like v1)
  }
  
  // Update to latest version
  await writeSchemaVersion(CURRENT_SCHEMA_VERSION, cwdProvider);
}

/**
 * Ensure the schema is up to date
 * Checks version and runs migrations if needed
 * @throws Error if migration fails or version is too new
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
