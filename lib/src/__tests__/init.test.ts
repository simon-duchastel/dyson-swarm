import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkInitialization, isInitialized, initialize, initializeForce, NotInitializedError } from '../init.js';
import { TaskFileUtils } from '../tasks/file-utils.js';

// Mock filesystem
interface MockFileSystem {
  files: Map<string, string>;
  directories: Set<string>;
}

const mockFS: MockFileSystem = {
  files: new Map(),
  directories: new Set()
};

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn((path: string) => {
      const content = mockFS.files.get(path.toString());
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return Promise.resolve(content);
    }),
    writeFile: vi.fn((path: string, content: string) => {
      const pathStr = path.toString();
      mockFS.files.set(pathStr, content);
      const dirPath = pathStr.split('/').slice(0, -1).join('/');
      mockFS.directories.add(dirPath);
      return Promise.resolve();
    }),
    mkdir: vi.fn((path: string) => {
      mockFS.directories.add(path.toString());
      // Also add all parent directories
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
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
      return Promise.resolve();
    }),
    stat: vi.fn((path: string) => {
      const isDir = mockFS.directories.has(path.toString());
      const isFile = mockFS.files.has(path.toString());
      if (!isDir && !isFile) {
        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      }
      return Promise.resolve({
        isDirectory: () => isDir,
        isFile: () => isFile
      });
    }),
    rm: vi.fn((path: string) => {
      // Remove files
      for (const filePath of mockFS.files.keys()) {
        if (filePath.startsWith(path.toString())) {
          mockFS.files.delete(filePath);
        }
      }
      // Remove directories
      for (const dirPath of mockFS.directories) {
        if (dirPath.startsWith(path.toString())) {
          mockFS.directories.delete(dirPath);
        }
      }
      return Promise.resolve();
    }),
  }
}));

// Mock path functions
vi.mock('node:path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  resolve: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/');
  }),
}));

// Mock paths module
vi.mock('../paths.js', () => ({
  getDysonDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm`;
  }),
  getTasksDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/tasks`;
  }),
  getStatusesDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/statuses`;
  }),
  getLockfilePath: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/lockfile`;
  }),
}));

// Mock schema-version
vi.mock('../tasks/schema-version/index.js', () => ({
  CURRENT_SCHEMA_VERSION: 2,
  getVersionFilePath: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/version`;
  }),
}));

describe('init', () => {
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
    
    // Add the test directory
    mockFS.directories.add(testCwd);
  });

  describe('checkInitialization', () => {
    it('should return not initialized when .swarm directory does not exist', async () => {
      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('.swarm directory');
    });

    it('should return not initialized when version file is missing', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('version file');
    });

    it('should return not initialized when tasks directory is missing', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, '2');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('tasks directory');
    });

    it('should return not initialized when statuses directory is missing', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, '2');
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('statuses directory');
    });

    it('should return not initialized when status files are missing', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, '2');
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);
      mockFS.directories.add(`${testCwd}/.swarm/statuses`);

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('status file: draft');
      expect(result.missingComponents).toContain('status file: open');
      expect(result.missingComponents).toContain('status file: in-progress');
      expect(result.missingComponents).toContain('status file: closed');
    });

    it('should return not initialized when lockfile is missing', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, '2');
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);
      mockFS.directories.add(`${testCwd}/.swarm/statuses`);
      mockFS.files.set(`${testCwd}/.swarm/statuses/draft`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/open`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/in-progress`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/closed`, '');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('lockfile');
    });

    it('should return initialized when all components exist', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, '2');
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);
      mockFS.directories.add(`${testCwd}/.swarm/statuses`);
      mockFS.files.set(`${testCwd}/.swarm/statuses/draft`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/open`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/in-progress`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/closed`, '');
      mockFS.files.set(`${testCwd}/.swarm/lockfile`, '');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(true);
      expect(result.missingComponents).toHaveLength(0);
    });

    it('should return not initialized when version file is invalid', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, 'invalid');
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);
      mockFS.directories.add(`${testCwd}/.swarm/statuses`);
      mockFS.files.set(`${testCwd}/.swarm/statuses/draft`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/open`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/in-progress`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/closed`, '');
      mockFS.files.set(`${testCwd}/.swarm/lockfile`, '');

      const result = await checkInitialization(cwdProvider);
      
      expect(result.isInitialized).toBe(false);
      expect(result.missingComponents).toContain('valid version file');
    });
  });

  describe('isInitialized', () => {
    it('should return false for uninitialized directory', async () => {
      const result = await isInitialized(cwdProvider);
      expect(result).toBe(false);
    });

    it('should return true for initialized directory', async () => {
      mockFS.directories.add(`${testCwd}/.swarm`);
      mockFS.files.set(`${testCwd}/.swarm/version`, '2');
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);
      mockFS.directories.add(`${testCwd}/.swarm/statuses`);
      mockFS.files.set(`${testCwd}/.swarm/statuses/draft`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/open`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/in-progress`, '');
      mockFS.files.set(`${testCwd}/.swarm/statuses/closed`, '');
      mockFS.files.set(`${testCwd}/.swarm/lockfile`, '');

      const result = await isInitialized(cwdProvider);
      expect(result).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should create all required files and directories', async () => {
      await initialize(cwdProvider);

      // Check .swarm directory exists
      expect(mockFS.directories.has(`${testCwd}/.swarm`)).toBe(true);
      
      // Check version file
      expect(mockFS.files.has(`${testCwd}/.swarm/version`)).toBe(true);
      expect(mockFS.files.get(`${testCwd}/.swarm/version`)).toBe('2');
      
      // Check tasks directory
      expect(mockFS.directories.has(`${testCwd}/.swarm/tasks`)).toBe(true);
      
      // Check statuses directory and files
      expect(mockFS.directories.has(`${testCwd}/.swarm/statuses`)).toBe(true);
      expect(mockFS.files.has(`${testCwd}/.swarm/statuses/draft`)).toBe(true);
      expect(mockFS.files.has(`${testCwd}/.swarm/statuses/open`)).toBe(true);
      expect(mockFS.files.has(`${testCwd}/.swarm/statuses/in-progress`)).toBe(true);
      expect(mockFS.files.has(`${testCwd}/.swarm/statuses/closed`)).toBe(true);
      
      // Check lockfile
      expect(mockFS.files.has(`${testCwd}/.swarm/lockfile`)).toBe(true);
    });

    it('should throw error when already initialized', async () => {
      // Initialize first
      await initialize(cwdProvider);

      // Try to initialize again
      await expect(initialize(cwdProvider)).rejects.toThrow('already initialized');
    });
  });

  describe('initializeForce', () => {
    it('should reinitialize even when already initialized', async () => {
      // Initialize first
      await initialize(cwdProvider);

      // Add a file to verify it gets removed
      mockFS.files.set(`${testCwd}/.swarm/test-file.txt`, 'test content');
      expect(mockFS.files.has(`${testCwd}/.swarm/test-file.txt`)).toBe(true);

      // Force reinitialize
      await initializeForce(cwdProvider);

      // Verify it's fresh
      expect(mockFS.files.has(`${testCwd}/.swarm/test-file.txt`)).toBe(false);
      
      // Verify structure is correct
      expect(mockFS.directories.has(`${testCwd}/.swarm`)).toBe(true);
      expect(mockFS.files.has(`${testCwd}/.swarm/version`)).toBe(true);
    });

    it('should initialize fresh directory', async () => {
      await initializeForce(cwdProvider);

      expect(mockFS.directories.has(`${testCwd}/.swarm`)).toBe(true);
      expect(mockFS.files.has(`${testCwd}/.swarm/version`)).toBe(true);
    });
  });

  describe('NotInitializedError', () => {
    it('should create error with default message', () => {
      const error = new NotInitializedError();
      expect(error.message).toBe('This directory is not initialized for dyson-swarm. Run "swarm init" to initialize.');
      expect(error.name).toBe('NotInitializedError');
      expect(error.missingComponents).toEqual([]);
    });

    it('should create error with custom message and components', () => {
      const error = new NotInitializedError('Custom message', ['.swarm directory', 'version file']);
      expect(error.message).toBe('Custom message');
      expect(error.missingComponents).toEqual(['.swarm directory', 'version file']);
    });
  });
});
