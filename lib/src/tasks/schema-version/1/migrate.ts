/**
 * Migration from version 0 (pre-versioning) to version 1
 * 
 * This is a no-op migration since version 1 is the initial schema version.
 * The version file will be created by the schema version system.
 */

import type { TaskManagerOptions } from '../../types.js';

/**
 * Migrate from version 0 to version 1
 * @param cwdProvider - Optional function to provide current working directory
 */
export async function migrate(
  _cwdProvider?: () => string
): Promise<void> {
  // Version 1 is the initial schema, so no migration needed
  // The version file will be created by ensureSchemaVersion()
}

/**
 * Migration metadata
 */
export const migrationInfo = {
  fromVersion: 0,
  toVersion: 1,
  description: 'Initial schema version - no migration needed',
};
