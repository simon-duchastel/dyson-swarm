import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  VERSION_FILE_NAME,
  getVersionFilePath,
  readSchemaVersion,
  writeSchemaVersion,
  initializeSchemaVersion,
  ensureSchemaVersion,
  migrateToLatest,
  isSchemaCompatible,
} from '../index.js';

// Mock filesystem
interface MockFileSystem {
  files: Map<string, string>;
  directories: Set<string>;
}

const mockFS: MockFileSystem = {
  files: new Map(),
  directories: new Set(),
};

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn((path: string) => {
      const content = mockFS.files.get(path.toString());
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      }
      return Promise.resolve(content);
    }),
    writeFile: vi.fn((path: string, content: string) => {
      mockFS.files.set(path.toString(), content);
      const dirPath = path.toString().split('/').slice(0, -1).join('/');
      mockFS.directories.add(dirPath);
      return Promise.resolve();
    }),
    mkdir: vi.fn((path: string) => {
      mockFS.directories.add(path.toString());
      const parts = path.toString().split('/');
      for (let i = 1; i <= parts.length; i++) {
        const parentPath = parts.slice(0, i).join('/');
        if (parentPath) {
          mockFS.directories.add(parentPath);
        }
      }
      return Promise.resolve();
    }),
    access: vi.fn((path: string) => {
      const exists = mockFS.files.has(path.toString()) || mockFS.directories.has(path.toString());
      if (!exists) {
        const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      }
      return Promise.resolve();
    }),
    stat: vi.fn((path: string) => {
      const isDir = mockFS.directories.has(path.toString());
      const isFile = mockFS.files.has(path.toString());
      if (!isDir && !isFile) {
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      }
      return Promise.resolve({
        isDirectory: () => isDir,
        isFile: () => isFile,
      });
    }),
    rename: vi.fn((oldPath: string, newPath: string) => {
      // Move files
      for (const [filePath, content] of mockFS.files) {
        if (filePath.startsWith(oldPath.toString())) {
          const newFilePath = filePath.replace(oldPath.toString(), newPath.toString());
          mockFS.files.set(newFilePath, content);
          mockFS.files.delete(filePath);
        }
      }
      
      // Move directories
      for (const dirPath of mockFS.directories) {
        if (dirPath.startsWith(oldPath.toString())) {
          const newDirPath = dirPath.replace(oldPath.toString(), newPath.toString());
          mockFS.directories.add(newDirPath);
          mockFS.directories.delete(dirPath);
        }
      }
      
      return Promise.resolve();
    }),
    rmdir: vi.fn((path: string) => {
      mockFS.directories.delete(path.toString());
      return Promise.resolve();
    }),
  },
}));

// Mock path module
vi.mock('node:path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  resolve: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/');
  }),
}));

// Mock paths module
vi.mock('../../../paths.js', () => ({
  getDysonDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm`;
  }),
  getStatusesDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/statuses`;
  }),
  getStatusFile: vi.fn((status: string, cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/statuses/${status}`;
  }),
  getTasksDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/tasks`;
  }),
  getTaskDir: vi.fn((taskId: string, cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/tasks/${taskId}`;
  }),
  getLockfilePath: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/lockfile`;
  }),
}));

describe('Schema Version', () => {
  let testCwd: string;
  let cwdProvider: () => string;

  beforeEach(() => {
    // Reset mock filesystem
    mockFS.files.clear();
    mockFS.directories.clear();
    
    // Clear all vi.fn mocks
    vi.clearAllMocks();
    
    testCwd = '/test/workspace';
    cwdProvider = () => testCwd;
  });

  describe('getVersionFilePath', () => {
    it('should return correct version file path', () => {
      const path = getVersionFilePath(cwdProvider);
      expect(path).toBe('/test/workspace/.swarm/version');
    });

  });

  describe('readSchemaVersion', () => {
    it('should return 0 when version file does not exist', async () => {
      const version = await readSchemaVersion(cwdProvider);
      expect(version).toBe(0);
    });

    it('should read version from existing file', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '1');
      
      const version = await readSchemaVersion(cwdProvider);
      expect(version).toBe(1);
    });

    it('should handle version 2 in file', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '2');
      
      const version = await readSchemaVersion(cwdProvider);
      expect(version).toBe(2);
    });

    it('should return 0 for invalid version content', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, 'not-a-number');
      
      const version = await readSchemaVersion(cwdProvider);
      expect(version).toBe(0);
    });

    it('should return 0 for empty file', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '');
      
      const version = await readSchemaVersion(cwdProvider);
      expect(version).toBe(0);
    });

    it('should handle whitespace in version file', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '  3  ');
      
      const version = await readSchemaVersion(cwdProvider);
      expect(version).toBe(3);
    });
  });

  describe('writeSchemaVersion', () => {
    it('should write version to file', async () => {
      await writeSchemaVersion(1, cwdProvider);
      
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      expect(mockFS.files.get(versionPath)).toBe('1');
    });

    it('should write version 2 to file', async () => {
      await writeSchemaVersion(2, cwdProvider);
      
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      expect(mockFS.files.get(versionPath)).toBe('2');
    });

    it('should overwrite existing version', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '1');
      
      await writeSchemaVersion(3, cwdProvider);
      
      expect(mockFS.files.get(versionPath)).toBe('3');
    });
  });

  describe('initializeSchemaVersion', () => {
    it('should write current schema version for new installation', async () => {
      await initializeSchemaVersion(cwdProvider);
      
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });
  });

  describe('ensureSchemaVersion', () => {
    it('should initialize version for new installation (version 0)', async () => {
      await ensureSchemaVersion(cwdProvider);
      
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });

    it('should not modify version when already up to date', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, CURRENT_SCHEMA_VERSION.toString());
      
      await ensureSchemaVersion(cwdProvider);
      
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });

    it('should migrate when version is older', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '1');
      
      await ensureSchemaVersion(cwdProvider);
      
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });

    it('should throw error when version is newer than supported', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '999');
      
      await expect(ensureSchemaVersion(cwdProvider)).rejects.toThrow(
        'Schema version 999 is newer than supported version'
      );
    });
  });

  describe('migrateToLatest', () => {
    it('should update version file after migration', async () => {
      await migrateToLatest(0, cwdProvider);
      
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });

    it('should update from version 1 to current', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '1');
      
      await migrateToLatest(1, cwdProvider);
      
      // Should be current version (2)
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });

    it('should handle migration from multiple versions behind', async () => {
      await migrateToLatest(0, cwdProvider);
      
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      expect(mockFS.files.get(versionPath)).toBe(CURRENT_SCHEMA_VERSION.toString());
    });
  });

  describe('isSchemaCompatible', () => {
    it('should return true for compatible schema', async () => {
      const compatible = await isSchemaCompatible(cwdProvider);
      expect(compatible).toBe(true);
    });

    it('should return true when version file does not exist', async () => {
      const compatible = await isSchemaCompatible(cwdProvider);
      expect(compatible).toBe(true);
    });

    it('should return true when version matches current', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, CURRENT_SCHEMA_VERSION.toString());
      
      const compatible = await isSchemaCompatible(cwdProvider);
      expect(compatible).toBe(true);
    });

    it('should return true when version is older and can migrate', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '1');
      
      const compatible = await isSchemaCompatible(cwdProvider);
      expect(compatible).toBe(true);
    });

    it('should return false when version is too new', async () => {
      const versionPath = `${testCwd}/.swarm/${VERSION_FILE_NAME}`;
      mockFS.files.set(versionPath, '999');
      
      const compatible = await isSchemaCompatible(cwdProvider);
      expect(compatible).toBe(false);
    });
  });

  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should be set to 3', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(3);
    });

    it('should be a positive integer', () => {
      expect(CURRENT_SCHEMA_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(CURRENT_SCHEMA_VERSION)).toBe(true);
    });
  });

  describe('VERSION_FILE_NAME', () => {
    it('should be "version"', () => {
      expect(VERSION_FILE_NAME).toBe('version');
    });
  });
});
