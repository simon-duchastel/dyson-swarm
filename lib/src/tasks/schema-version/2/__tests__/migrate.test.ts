import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrate } from '../migrate.js';
import { TaskFileUtils } from '../../../file-utils.js';
import { StatusUtils } from '../../../status-utils.js';

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
    readdir: vi.fn((path: string) => {
      const entries: Array<{ name: string; isFile: () => boolean; isDirectory: () => boolean }> = [];
      
      // Add files in this directory
      for (const filePath of mockFS.files.keys()) {
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
      for (const dirPath of mockFS.directories) {
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
    rm: vi.fn((path: string) => {
      for (const filePath of mockFS.files.keys()) {
        if (filePath.startsWith(path.toString())) {
          mockFS.files.delete(filePath);
        }
      }
      for (const dirPath of mockFS.directories) {
        if (dirPath.startsWith(path.toString())) {
          mockFS.directories.delete(dirPath);
        }
      }
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
vi.mock('../../../../paths.js', () => ({
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
  getTaskFile: vi.fn((taskId: string, cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/tasks/${taskId}/${taskId}.task`;
  }),
  getSubtasksDir: vi.fn((taskId: string, cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/tasks/${taskId}/sub-tasks`;
  }),
}));

describe('v2 Migration', () => {
  let testCwd: string;
  let cwdProvider: () => string;

  beforeEach(() => {
    // Reset mock filesystem
    mockFS.files.clear();
    mockFS.directories.clear();
    vi.clearAllMocks();
    
    testCwd = '/test/workspace';
    cwdProvider = () => testCwd;
  });

  describe('migrate', () => {
    it('should create v2 structure from empty v1 directory', async () => {
      // Create tasks directory (but no status subdirs)
      mockFS.directories.add(`${testCwd}/.swarm/tasks`);
      
      await migrate(cwdProvider);
      
      // Verify status files were created
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/draft`)).toBe('');
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/open`)).toBe('');
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/in-progress`)).toBe('');
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/closed`)).toBe('');
    });

    it('should migrate tasks from v1 structure', async () => {
      // Set up v1 structure with one task
      const taskId = '11111111-1111-4111-8111-111111111111';
      const v1TaskFile = `${testCwd}/.swarm/tasks/open/${taskId}/${taskId}.task`;
      const taskContent = `---
title: "Test Task"
---
Test description`;
      
      mockFS.files.set(v1TaskFile, taskContent);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${taskId}`);
      
      await migrate(cwdProvider);
      
      // Verify task was moved to v2 structure
      expect(mockFS.files.get(`${testCwd}/.swarm/tasks/${taskId}/${taskId}.task`)).toBe(taskContent);
      
      // Verify task ID is in open status file
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/open`)).toContain(taskId);
    });

    it('should migrate tasks from multiple statuses', async () => {
      const openTaskId = '11111111-1111-4111-8111-111111111111';
      const closedTaskId = '22222222-2222-4222-8222-222222222222';
      
      // Set up v1 structure with tasks in different statuses
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${openTaskId}`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/closed`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/closed/${closedTaskId}`);
      
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/${openTaskId}/${openTaskId}.task`,
        `---
title: "Open Task"
---
Description`
      );
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/closed/${closedTaskId}/${closedTaskId}.task`,
        `---
title: "Closed Task"
---
Description`
      );
      
      await migrate(cwdProvider);
      
      // Verify tasks are in correct status files
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/open`)).toContain(openTaskId);
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/closed`)).toContain(closedTaskId);
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/open`)).not.toContain(closedTaskId);
    });

    it('should migrate subtasks with fully qualified IDs', async () => {
      const parentTaskId = '11111111-1111-4111-8111-111111111111';
      const subtaskId = '22222222-2222-4222-8222-222222222222';
      const fullyQualifiedId = `${parentTaskId}/${subtaskId}`;
      const subtaskContent = `---
title: "Subtask"
---
Subtask description`;
      
      // Set up v1 structure with subtask
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${parentTaskId}`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${parentTaskId}/sub-tasks`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${parentTaskId}/sub-tasks/open`);
      
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/${parentTaskId}/${parentTaskId}.task`,
        `---
title: "Parent Task"
---
Description`
      );
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/${parentTaskId}/sub-tasks/open/${subtaskId}.task`,
        subtaskContent
      );
      
      await migrate(cwdProvider);
      
      // Verify subtask was moved to v2 structure
      const v2SubtaskPath = `${testCwd}/.swarm/tasks/${parentTaskId}/sub-tasks/${subtaskId}/${subtaskId}.task`;
      expect(mockFS.files.get(v2SubtaskPath)).toBe(subtaskContent);
      
      // Verify both parent and subtask are in status file
      const openStatus = mockFS.files.get(`${testCwd}/.swarm/statuses/open`);
      expect(openStatus).toContain(parentTaskId);
      expect(openStatus).toContain(fullyQualifiedId);
    });

    it('should sort task IDs lexicographically in status files', async () => {
      const taskIdB = '22222222-2222-4222-8222-222222222222';
      const taskIdA = '11111111-1111-4111-8111-111111111111';
      const taskIdC = '33333333-3333-4333-8333-333333333333';
      
      // Set up v1 structure with tasks in non-sorted order
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${taskIdB}`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${taskIdA}`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open/${taskIdC}`);
      
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/${taskIdB}/${taskIdB}.task`,
        `---
title: "Task B"
---
Description`
      );
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/${taskIdA}/${taskIdA}.task`,
        `---
title: "Task A"
---
Description`
      );
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/${taskIdC}/${taskIdC}.task`,
        `---
title: "Task C"
---
Description`
      );
      
      await migrate(cwdProvider);
      
      // Verify task IDs are sorted
      const openStatus = mockFS.files.get(`${testCwd}/.swarm/statuses/open`);
      const lines = openStatus!.trim().split('\n');
      expect(lines).toEqual([taskIdA, taskIdB, taskIdC]);
    });

    it('should create empty draft status file', async () => {
      await migrate(cwdProvider);
      
      expect(mockFS.files.get(`${testCwd}/.swarm/statuses/draft`)).toBe('');
    });

    it('should clean up v1 status directories', async () => {
      // Set up v1 structure
      mockFS.directories.add(`${testCwd}/.swarm/tasks/open`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/closed`);
      mockFS.directories.add(`${testCwd}/.swarm/tasks/in-progress`);
      
      mockFS.files.set(
        `${testCwd}/.swarm/tasks/open/task-1/task-1.task`,
        `---
title: "Task"
---
Description`
      );
      
      await migrate(cwdProvider);
      
      // v1 status directories should be removed
      expect(mockFS.directories.has(`${testCwd}/.swarm/tasks/open`)).toBe(false);
      expect(mockFS.directories.has(`${testCwd}/.swarm/tasks/closed`)).toBe(false);
      expect(mockFS.directories.has(`${testCwd}/.swarm/tasks/in-progress`)).toBe(false);
    });
  });
});
