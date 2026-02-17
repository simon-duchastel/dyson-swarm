import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskManager } from '../manager.js';
import { TaskFileUtils } from '../file-utils.js';
import { StatusUtils } from '../status-utils.js';
import { TaskStatus } from '../types.js';

// Mock filesystem
interface MockFileSystem {
  files: Map<string, string>;
  directories: Set<string>;
  stats: Map<string, { isDirectory: () => boolean }>;
}

const mockFS: MockFileSystem = {
  files: new Map(),
  directories: new Set(),
  stats: new Map()
};

let mockUUIDCounter = 1;
const mockUUIDs = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
];

// Track file watchers for testing
const fileWatchers = new Map<string, Set<(curr: { mtime: Date }, prev: { mtime: Date }) => void>>();

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
      const hadFile = mockFS.files.has(pathStr);
      mockFS.files.set(pathStr, content);
      const dirPath = pathStr.split('/').slice(0, -1).join('/');
      mockFS.directories.add(dirPath);
      
      // Trigger watchers if file was modified
      const watchers = fileWatchers.get(pathStr);
      if (watchers && hadFile) {
        const now = new Date();
        const prev = new Date(now.getTime() - 1000);
        watchers.forEach(cb => cb({ mtime: now }, { mtime: prev }));
      }
      
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
        isDirectory: () => isDir
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
    rmdir: vi.fn((path: string) => {
      mockFS.directories.delete(path.toString());
      return Promise.resolve();
    })
  },
  watchFile: vi.fn((path: string, options: unknown, listener: (curr: { mtime: Date }, prev: { mtime: Date }) => void) => {
    const pathStr = path.toString();
    if (!fileWatchers.has(pathStr)) {
      fileWatchers.set(pathStr, new Set());
    }
    fileWatchers.get(pathStr)!.add(listener);
  }),
  unwatchFile: vi.fn((path: string, listener: (curr: { mtime: Date }, prev: { mtime: Date }) => void) => {
    const pathStr = path.toString();
    const watchers = fileWatchers.get(pathStr);
    if (watchers) {
      watchers.delete(listener);
    }
  })
}));

// Mock proper-lockfile
vi.mock('proper-lockfile', () => ({
  default: {
    lock: vi.fn(() => Promise.resolve(() => Promise.resolve()))
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    const uuid = mockUUIDs[(mockUUIDCounter - 1) % mockUUIDs.length];
    mockUUIDCounter++;
    return uuid;
  })
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
vi.mock('../../paths.js', () => ({
  getDysonDir: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm`;
  }),
  getLockfilePath: vi.fn((cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    return `${cwd}/.swarm/lockfile`;
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
    if (!taskId.includes('/')) {
      return `${cwd}/.swarm/tasks/${taskId}/sub-tasks`;
    }
    const parts = taskId.split('/');
    const basePath = `${cwd}/.swarm/tasks/${parts[0]}`;
    const subtaskPath = parts.slice(1).map(p => `sub-tasks/${p}`).join('/');
    return `${basePath}/${subtaskPath}/sub-tasks`;
  }),
  getSubtaskDir: vi.fn((fullyQualifiedId: string, cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    const parts = fullyQualifiedId.split('/');
    const basePath = `${cwd}/.swarm/tasks/${parts[0]}`;
    const subtaskPath = parts.slice(1).map(p => `sub-tasks/${p}`).join('/');
    return `${basePath}/${subtaskPath}`;
  }),
  getSubtaskFile: vi.fn((fullyQualifiedId: string, cwdProvider?: () => string) => {
    const cwd = cwdProvider ? cwdProvider() : '/test';
    const parts = fullyQualifiedId.split('/');
    const subtaskId = parts[parts.length - 1];
    const basePath = `${cwd}/.swarm/tasks/${parts[0]}`;
    const subtaskPath = parts.slice(1).map(p => `sub-tasks/${p}`).join('/');
    return `${basePath}/${subtaskPath}/${subtaskId}.task`;
  }),
}));

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let testCwd: string;

  beforeEach(() => {
    // Reset mock filesystem
    mockFS.files.clear();
    mockFS.directories.clear();
    mockFS.stats.clear();
    fileWatchers.clear();
    mockUUIDCounter = 1;
    
    // Clear all vi.fn mocks
    vi.clearAllMocks();
    
    testCwd = '/test/workspace';
    taskManager = new TaskManager({
      cwdProvider: () => testCwd,
    });
  });


  describe('createTask', () => {
    it('should create an open task', async () => {
      const task = await taskManager.createTask({
        title: 'Test Task',
        description: 'This is a test task',
      });

      expect(task.id).toBeDefined();
      expect(task.frontmatter.title).toBe('Test Task');
      expect(task.description).toBe('This is a test task');
      expect(task.status).toBe('open');
      expect(task.frontmatter.assignee).toBeUndefined();
    });

    it('should create an in-progress task with assignee', async () => {
      const task = await taskManager.createTask({
        title: 'Assigned Task',
        description: 'This task is assigned',
        assignee: 'john.doe',
      });

      expect(task.status).toBe('in-progress');
      expect(task.frontmatter.assignee).toBe('john.doe');
    });

    it('should create a subtask with parentTaskId', async () => {
      const parent = await taskManager.createTask({
        title: 'Parent Task',
        description: 'Task with subtasks',
      });

      const subtask1 = await taskManager.createTask({
        title: 'Subtask 1',
        description: 'First subtask',
        parentTaskId: parent.id,
      });

      const subtask2 = await taskManager.createTask({
        title: 'Subtask 2',
        description: 'Second subtask',
        parentTaskId: parent.id,
      });

      expect(subtask1.frontmatter.title).toBe('Subtask 1');
      expect(subtask1.status).toBe('open');
      expect(subtask1.id).toContain('/');
      expect(subtask1.id).toContain(parent.id);
      
      expect(subtask2.frontmatter.title).toBe('Subtask 2');
    });

    it('should support deeply nested subtasks', async () => {
      const level1 = await taskManager.createTask({
        title: 'Level 1 Task',
        description: 'Top level',
      });

      const level2 = await taskManager.createTask({
        title: 'Level 2 Subtask',
        description: 'Nested one level',
        parentTaskId: level1.id,
      });

      const level3 = await taskManager.createTask({
        title: 'Level 3 Subtask',
        description: 'Nested two levels',
        parentTaskId: level2.id,
      });

      const level4 = await taskManager.createTask({
        title: 'Level 4 Subtask',
        description: 'Nested three levels',
        parentTaskId: level3.id,
      });

      expect(level2.id).toBe(`${level1.id}/${level2.id.split('/')[1]}`);
      expect(level3.id).toBe(`${level2.id}/${level3.id.split('/')[2]}`);
      expect(level4.id).toBe(`${level3.id}/${level4.id.split('/')[3]}`);
      
      expect(level4.id.split('/').length).toBe(4);

      const retrieved = await taskManager.getTask(level4.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.frontmatter.title).toBe('Level 4 Subtask');
    });
  });

  describe('getTask', () => {
    it('should retrieve a created task', async () => {
      const created = await taskManager.createTask({
        title: 'Test Task',
        description: 'This is a test task',
      });

      const retrieved = await taskManager.getTask(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.frontmatter.title).toBe('Test Task');
    });

    it('should return null for non-existent task', async () => {
      const task = await taskManager.getTask('non-existent-id');
      expect(task).toBeNull();
    });
  });

  describe('listTasks', () => {
    it('should list all tasks', async () => {
      await taskManager.createTask({
        title: 'Task 1',
        description: 'First task',
      });

      await taskManager.createTask({
        title: 'Task 2',
        description: 'Second task',
        assignee: 'john.doe',
      });

      const tasks = await taskManager.listTasks();
      expect(tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      await taskManager.createTask({
        title: 'Open Task',
        description: 'Open task',
      });

      await taskManager.createTask({
        title: 'Assigned Task',
        description: 'Assigned task',
        assignee: 'john.doe',
      });

      const openTasks = await taskManager.listTasks({ status: 'open' });
      const inProgressTasks = await taskManager.listTasks({ status: 'in-progress' });

      expect(openTasks).toHaveLength(1);
      expect(openTasks[0].frontmatter.title).toBe('Open Task');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].frontmatter.title).toBe('Assigned Task');
    });

    it('should include subtasks in the listing', async () => {
      const parent = await taskManager.createTask({
        title: 'Parent Task',
        description: 'Main task',
      });

      const subtask = await taskManager.createTask({
        title: 'Subtask',
        description: 'A subtask',
        parentTaskId: parent.id,
      });

      const tasks = await taskManager.listTasks();
      
      // Should include both parent and subtask
      expect(tasks).toHaveLength(2);
      
      // Verify both are present
      const taskIds = tasks.map(t => t.id);
      expect(taskIds).toContain(parent.id);
      expect(taskIds).toContain(subtask.id);
    });

  });

  describe('listTaskStream', () => {
    it('should yield initial task list', async () => {
      await taskManager.createTask({
        title: 'Task 1',
        description: 'First task',
      });

      const stream = taskManager.listTaskStream();
      const firstValue = await stream.next();
      
      expect(firstValue.done).toBe(false);
      expect(firstValue.value).toHaveLength(1);
      expect(firstValue.value![0].frontmatter.title).toBe('Task 1');
      
      // Clean up - close the stream
      await stream.return?.();
    });

    it('should be a valid async generator', async () => {
      // Create a task
      await taskManager.createTask({
        title: 'Open Task',
        description: 'An open task',
      });

      const stream = taskManager.listTaskStream();
      
      // Verify it's an async generator
      expect(typeof stream.next).toBe('function');
      expect(typeof stream.return).toBe('function');
      
      // Get initial value
      const firstValue = await stream.next();
      expect(firstValue.done).toBe(false);
      expect(firstValue.value).toHaveLength(1);
      expect(firstValue.value![0].frontmatter.title).toBe('Open Task');
      
      // Clean up
      await stream.return?.();
    });

    it('should filter by status in stream', async () => {
      await taskManager.createTask({
        title: 'Open Task',
        description: 'An open task',
      });

      await taskManager.createTask({
        title: 'Assigned Task',
        description: 'An assigned task',
        assignee: 'john.doe',
      });

      const stream = taskManager.listTaskStream({ status: 'open' });
      const firstValue = await stream.next();
      
      expect(firstValue.done).toBe(false);
      expect(firstValue.value).toHaveLength(1);
      expect(firstValue.value![0].frontmatter.title).toBe('Open Task');
      
      // Clean up
      await stream.return?.();
    });
  });

  describe('updateTask', () => {
    it('should update task title and description', async () => {
      const task = await taskManager.createTask({
        title: 'Original Title',
        description: 'Original description',
      });

      const updated = await taskManager.updateTask(task.id, {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(updated).toBeDefined();
      expect(updated!.frontmatter.title).toBe('Updated Title');
      expect(updated!.description).toBe('Updated description');
    });

    it('should assign task and change status', async () => {
      const task = await taskManager.createTask({
        title: 'Open Task',
        description: 'Task to assign',
      });

      const updated = await taskManager.updateTask(task.id, {
        assignee: 'john.doe',
      });

      expect(updated!.status).toBe('in-progress');
      expect(updated!.frontmatter.assignee).toBe('john.doe');
    });

    it('should unassign task and change status to open', async () => {
      const task = await taskManager.createTask({
        title: 'Assigned Task',
        description: 'Task to unassign',
        assignee: 'john.doe',
      });

      const updated = await taskManager.updateTask(task.id, {
        assignee: undefined,
      });

      expect(updated!.status).toBe('open');
      expect(updated!.frontmatter.assignee).toBeUndefined();
    });

    it('should return null for non-existent task', async () => {
      const updated = await taskManager.updateTask('non-existent-id', {
        title: 'New Title',
      });
      expect(updated).toBeNull();
    });

    it('should update subtask fields', async () => {
      const parent = await taskManager.createTask({
        title: 'Parent Task',
        description: 'Task with subtasks',
      });

      const subtask = await taskManager.createTask({
        title: 'Subtask',
        description: 'Original subtask description',
        parentTaskId: parent.id,
      });

      const updated = await taskManager.updateTask(subtask.id, {
        title: 'Updated Subtask',
      });

      expect(updated).toBeDefined();
      expect(updated!.frontmatter.title).toBe('Updated Subtask');
    });
  });

  describe('changeTaskStatus', () => {
    it('should change task status', async () => {
      const task = await taskManager.createTask({
        title: 'Test Task',
        description: 'Task to change status',
      });

      const updated = await taskManager.changeTaskStatus(task.id, 'closed');
      expect(updated!.status).toBe('closed');
    });

    it('should change subtask status', async () => {
      const parent = await taskManager.createTask({
        title: 'Parent Task',
        description: 'Task with subtasks',
      });

      const subtask = await taskManager.createTask({
        title: 'Subtask',
        description: 'A subtask',
        parentTaskId: parent.id,
      });

      const updated = await taskManager.changeTaskStatus(subtask.id, 'closed');
      expect(updated!.status).toBe('closed');
    });

    it('should return null for non-existent task', async () => {
      const updated = await taskManager.changeTaskStatus('non-existent-id', 'closed');
      expect(updated).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task = await taskManager.createTask({
        title: 'Task to Delete',
        description: 'This task will be deleted',
      });

      const deleted = await taskManager.deleteTask(task.id);
      expect(deleted).toBe(true);

      const retrieved = await taskManager.getTask(task.id);
      expect(retrieved).toBeNull();
    });

    it('should delete a task with subtasks', async () => {
      const task = await taskManager.createTask({
        title: 'Parent Task',
        description: 'Task with subtasks',
      });

      const subtask = await taskManager.createTask({
        title: 'Subtask 1',
        description: 'First subtask',
        parentTaskId: task.id,
      });

      const deleted = await taskManager.deleteTask(task.id);
      expect(deleted).toBe(true);

      const retrieved = await taskManager.getTask(task.id);
      expect(retrieved).toBeNull();

      const subtaskRetrieved = await taskManager.getTask(subtask.id);
      expect(subtaskRetrieved).toBeNull();
    });

    it('should delete a subtask', async () => {
      const parent = await taskManager.createTask({
        title: 'Parent Task',
        description: 'Task with subtasks',
      });

      const subtask = await taskManager.createTask({
        title: 'Subtask',
        description: 'A subtask',
        parentTaskId: parent.id,
      });

      const deleted = await taskManager.deleteTask(subtask.id);
      expect(deleted).toBe(true);

      const retrieved = await taskManager.getTask(subtask.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent task', async () => {
      const deleted = await taskManager.deleteTask('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('assignTask and unassignTask', () => {
    it('should assign and unassign tasks', async () => {
      const task = await taskManager.createTask({
        title: 'Test Task',
        description: 'Task for assignment',
      });

      const assigned = await taskManager.assignTask(task.id, 'john.doe');
      expect(assigned!.status).toBe('in-progress');
      expect(assigned!.frontmatter.assignee).toBe('john.doe');

      const unassigned = await taskManager.unassignTask(task.id);
      expect(unassigned!.status).toBe('open');
      expect(unassigned!.frontmatter.assignee).toBeUndefined();
    });
  });
});

describe('TaskFileUtils', () => {
  describe('parseTaskContent', () => {
    it('should parse task content with frontmatter', () => {
      const content = `---
title: "Test Task"
assignee: "john.doe"
---
This is the task description.`;

      const result = TaskFileUtils.parseTaskContent(content);
      
      expect(result.frontmatter.title).toBe('Test Task');
      expect(result.frontmatter.assignee).toBe('john.doe');
      expect(result.description).toBe('This is the task description.');
    });

    it('should handle missing assignee', () => {
      const content = `---
title: "Simple Task"
---
Simple task description.`;

      const result = TaskFileUtils.parseTaskContent(content);
      
      expect(result.frontmatter.title).toBe('Simple Task');
      expect(result.frontmatter.assignee).toBeUndefined();
      expect(result.description).toBe('Simple task description.');
    });

    it('should throw error for missing frontmatter', () => {
      const content = 'No frontmatter here';
      
      expect(() => TaskFileUtils.parseTaskContent(content)).toThrow('Invalid task file format');
    });
  });

  describe('taskToFileString', () => {
    it('should convert task to task file string', () => {
      const task = {
        id: 'test-id',
        frontmatter: {
          title: 'Test Task',
          assignee: 'john.doe',
        },
        description: 'Task description',
        status: 'in-progress' as TaskStatus,
      };

      const taskString = TaskFileUtils.taskToFileString(task);
      
      expect(taskString).toContain('title: "Test Task"');
      expect(taskString).toContain('assignee: "john.doe"');
      expect(taskString).toContain('Task description');
    });

    it('should handle task without assignee', () => {
      const task = {
        id: 'test-id',
        frontmatter: {
          title: 'Simple Task',
        },
        description: 'Simple description',
        status: 'open' as TaskStatus,
      };

      const taskString = TaskFileUtils.taskToFileString(task);
      
      expect(taskString).toContain('title: "Simple Task"');
      expect(taskString).not.toContain('assignee:');
      expect(taskString).toContain('Simple description');
    });
  });

  describe('generateTaskId', () => {
    it('should generate unique UUIDs', () => {
      const id1 = TaskFileUtils.generateTaskId();
      const id2 = TaskFileUtils.generateTaskId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });
});

describe('StatusUtils', () => {
  let testCwd: string;

  beforeEach(() => {
    // Reset mock filesystem
    mockFS.files.clear();
    mockFS.directories.clear();
    mockFS.stats.clear();
    vi.clearAllMocks();
    testCwd = '/test/workspace';
  });

  describe('readStatusFile', () => {
    it('should return empty array when status file does not exist', async () => {
      const ids = await StatusUtils.readStatusFile('open', () => testCwd);
      expect(ids).toEqual([]);
    });

    it('should read sorted task IDs from status file', async () => {
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      mockFS.files.set(statusFile, 'task-c\ntask-a\ntask-b\n');
      
      const ids = await StatusUtils.readStatusFile('open', () => testCwd);
      expect(ids).toEqual(['task-a', 'task-b', 'task-c']);
    });
  });

  describe('writeStatusFile', () => {
    it('should write sorted task IDs to status file', async () => {
      await StatusUtils.writeStatusFile('open', ['task-c', 'task-a', 'task-b'], () => testCwd);
      
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      const content = mockFS.files.get(statusFile);
      expect(content).toBe('task-a\ntask-b\ntask-c\n');
    });

    it('should write empty content for empty array', async () => {
      await StatusUtils.writeStatusFile('open', [], () => testCwd);
      
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      const content = mockFS.files.get(statusFile);
      expect(content).toBe('');
    });
  });

  describe('addTaskToStatus', () => {
    it('should add task ID to status file', async () => {
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      mockFS.files.set(statusFile, 'task-a\n');
      
      const added = await StatusUtils.addTaskToStatus('task-b', 'open', () => testCwd);
      expect(added).toBe(true);
      
      const content = mockFS.files.get(statusFile);
      expect(content).toBe('task-a\ntask-b\n');
    });

    it('should return false if task ID already exists', async () => {
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      mockFS.files.set(statusFile, 'task-a\n');
      
      const added = await StatusUtils.addTaskToStatus('task-a', 'open', () => testCwd);
      expect(added).toBe(false);
    });
  });

  describe('removeTaskFromStatus', () => {
    it('should remove task ID from status file', async () => {
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      mockFS.files.set(statusFile, 'task-a\ntask-b\ntask-c\n');
      
      const removed = await StatusUtils.removeTaskFromStatus('task-b', 'open', () => testCwd);
      expect(removed).toBe(true);
      
      const content = mockFS.files.get(statusFile);
      expect(content).toBe('task-a\ntask-c\n');
    });

    it('should return false if task ID does not exist', async () => {
      const statusFile = `${testCwd}/.swarm/statuses/open`;
      mockFS.files.set(statusFile, 'task-a\n');
      
      const removed = await StatusUtils.removeTaskFromStatus('task-b', 'open', () => testCwd);
      expect(removed).toBe(false);
    });
  });

  describe('moveTaskStatus', () => {
    it('should move task from one status to another', async () => {
      const openFile = `${testCwd}/.swarm/statuses/open`;
      const closedFile = `${testCwd}/.swarm/statuses/closed`;
      mockFS.files.set(openFile, 'task-a\ntask-b\n');
      mockFS.files.set(closedFile, 'task-c\n');
      
      await StatusUtils.moveTaskStatus('task-b', 'open', 'closed', () => testCwd);
      
      const openContent = mockFS.files.get(openFile);
      const closedContent = mockFS.files.get(closedFile);
      
      expect(openContent).toBe('task-a\n');
      // Task IDs should be sorted lexicographically: task-b < task-c
      expect(closedContent).toBe('task-b\ntask-c\n');
    });
  });

  describe('findTaskStatus', () => {
    it('should find task in open status', async () => {
      const openFile = `${testCwd}/.swarm/statuses/open`;
      mockFS.files.set(openFile, 'task-a\ntask-b\n');
      
      const status = await StatusUtils.findTaskStatus('task-b', () => testCwd);
      expect(status).toBe('open');
    });

    it('should return null for non-existent task', async () => {
      const status = await StatusUtils.findTaskStatus('task-x', () => testCwd);
      expect(status).toBeNull();
    });
  });
});
