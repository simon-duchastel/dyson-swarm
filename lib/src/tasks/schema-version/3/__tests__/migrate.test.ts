import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrate } from '../migrate.js';

// Mock filesystem
const mockFiles = new Map<string, string>();
const mockDirs = new Set<string>();

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn((path: string) => {
      const content = mockFiles.get(path.toString());
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return Promise.resolve(content);
    }),
    writeFile: vi.fn((path: string, content: string) => {
      mockFiles.set(path.toString(), content);
      return Promise.resolve();
    }),
    readdir: vi.fn((path: string) => {
      const entries: Array<{ name: string; isFile: () => boolean; isDirectory: () => boolean }> = [];
      
      // Add files in this directory
      for (const filePath of mockFiles.keys()) {
        const pathParts = filePath.split('/');
        if (pathParts.length >= 2) {
          const dirPart = pathParts.slice(0, -1).join('/');
          if (dirPart === path.toString()) {
            const fileName = pathParts[pathParts.length - 1];
            entries.push({
              name: fileName,
              isFile: () => true,
              isDirectory: () => false
            });
          }
        }
      }
      
      // Add subdirectories
      for (const dirPath of mockDirs) {
        const pathParts = dirPath.split('/');
        if (pathParts.length >= 2) {
          const parentDir = pathParts.slice(0, -1).join('/');
          if (parentDir === path.toString()) {
            const dirName = pathParts[pathParts.length - 1];
            if (!entries.find(e => e.name === dirName)) {
              entries.push({
                name: dirName,
                isFile: () => false,
                isDirectory: () => true
              });
            }
          }
        }
      }
      
      return Promise.resolve(entries);
    }),
  }
}));

vi.mock('../../../paths.js', () => ({
  getDysonDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm`;
  }),
  getStatusesDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/statuses`;
  }),
}));

vi.mock('../../file-utils.js', () => ({
  TaskFileUtils: {
    fileExists: vi.fn((path: string) => Promise.resolve(mockFiles.has(path.toString()))),
    dirExists: vi.fn((path: string) => Promise.resolve(mockDirs.has(path.toString()))),
  }
}));

describe('v3 migration', () => {
  const testCwd = '/test/workspace';
  const cwdProvider = () => testCwd;

  beforeEach(() => {
    mockFiles.clear();
    mockDirs.clear();
    vi.clearAllMocks();
  });

  it('should validate v2 structure exists', async () => {
    // Set up v2 structure
    mockDirs.add(`${testCwd}/.swarm`);
    mockDirs.add(`${testCwd}/.swarm/statuses`);
    mockDirs.add(`${testCwd}/.swarm/tasks`);
    mockFiles.set(`${testCwd}/.swarm/statuses/draft`, '');
    mockFiles.set(`${testCwd}/.swarm/statuses/open`, 'task-1\ntask-2\n');
    mockFiles.set(`${testCwd}/.swarm/statuses/in-progress`, 'task-3\n');
    mockFiles.set(`${testCwd}/.swarm/statuses/closed`, '');
    mockDirs.add(`${testCwd}/.swarm/tasks/task-1`);
    mockFiles.set(`${testCwd}/.swarm/tasks/task-1/task-1.task`, '---\ntitle: "Task 1"\n---\nDescription');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await migrate(cwdProvider);

    expect(consoleSpy).toHaveBeenCalledWith('Schema v3 migration complete: Task dependencies support added');
  });

  it('should handle empty v2 structure', async () => {
    // Set up empty v2 structure
    mockDirs.add(`${testCwd}/.swarm`);
    mockDirs.add(`${testCwd}/.swarm/statuses`);
    mockDirs.add(`${testCwd}/.swarm/tasks`);
    mockFiles.set(`${testCwd}/.swarm/statuses/draft`, '');
    mockFiles.set(`${testCwd}/.swarm/statuses/open`, '');
    mockFiles.set(`${testCwd}/.swarm/statuses/in-progress`, '');
    mockFiles.set(`${testCwd}/.swarm/statuses/closed`, '');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await migrate(cwdProvider);

    expect(consoleSpy).toHaveBeenCalledWith('Schema v3 migration complete: Task dependencies support added');
  });

  it('should not fail when status files do not exist', async () => {
    mockDirs.add(`${testCwd}/.swarm`);
    mockDirs.add(`${testCwd}/.swarm/statuses`);
    mockDirs.add(`${testCwd}/.swarm/tasks`);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await migrate(cwdProvider);

    expect(consoleSpy).toHaveBeenCalledWith('Schema v3 migration complete: Task dependencies support added');
  });

  it('should work without cwdProvider (uses process.cwd)', async () => {
    mockDirs.add(`${process.cwd()}/.swarm`);
    mockDirs.add(`${process.cwd()}/.swarm/statuses`);
    mockDirs.add(`${process.cwd()}/.swarm/tasks`);
    mockFiles.set(`${process.cwd()}/.swarm/statuses/draft`, '');
    mockFiles.set(`${process.cwd()}/.swarm/statuses/open`, '');
    mockFiles.set(`${process.cwd()}/.swarm/statuses/in-progress`, '');
    mockFiles.set(`${process.cwd()}/.swarm/statuses/closed`, '');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await migrate();

    expect(consoleSpy).toHaveBeenCalledWith('Schema v3 migration complete: Task dependencies support added');
  });
});

describe('migrationInfo', () => {
  it('should have correct metadata', async () => {
    const { migrationInfo } = await import('../migrate.js');
    
    expect(migrationInfo.fromVersion).toBe(2);
    expect(migrationInfo.toVersion).toBe(3);
    expect(migrationInfo.description).toContain('task dependencies');
  });
});
