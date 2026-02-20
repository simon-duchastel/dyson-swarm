import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dependAction, depsAction } from '../depend.js';

// Mock the TaskManager
const mockAddTaskDependency = vi.fn();
const mockRemoveTaskDependency = vi.fn();
const mockGetTaskDependencies = vi.fn();
const mockGetDependentTasks = vi.fn();
const mockGetTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    NotInitializedError: class NotInitializedError extends Error {},
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        addTaskDependency: mockAddTaskDependency,
        removeTaskDependency: mockRemoveTaskDependency,
        getTaskDependencies: mockGetTaskDependencies,
        getDependentTasks: mockGetDependentTasks,
        getTask: mockGetTask,
      };
    }),
  };
});

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('depend command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('add dependency', () => {
    it('should add a dependency successfully', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Task 1', dependsOn: ['dep-1'] },
        status: 'open',
      };
      mockAddTaskDependency.mockResolvedValue(mockTask);
      mockGetTaskDependencies.mockResolvedValue([
        { id: 'dep-1', frontmatter: { title: 'Dependency' }, status: 'closed' }
      ]);

      await dependAction('task-1', 'dep-1', { remove: false });

      expect(mockAddTaskDependency).toHaveBeenCalledWith('task-1', 'dep-1');
      expect(mockConsoleLog).toHaveBeenCalledWith('Added dependency: task-1 now depends on dep-1');
    });

    it('should show task not found error', async () => {
      mockAddTaskDependency.mockResolvedValue(null);

      await expect(dependAction('task-1', 'dep-1', { remove: false }))
        .rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle circular dependency error', async () => {
      mockAddTaskDependency.mockRejectedValue(new Error('Circular dependency: dep-1 already depends on task-1'));

      await expect(dependAction('task-1', 'dep-1', { remove: false }))
        .rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', 'Circular dependency: dep-1 already depends on task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('remove dependency', () => {
    it('should remove a dependency successfully', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Task 1' },
        status: 'open',
      };
      mockRemoveTaskDependency.mockResolvedValue(mockTask);
      mockGetTaskDependencies.mockResolvedValue([]);

      await dependAction('task-1', 'dep-1', { remove: true });

      expect(mockRemoveTaskDependency).toHaveBeenCalledWith('task-1', 'dep-1');
      expect(mockConsoleLog).toHaveBeenCalledWith('Removed dependency: task-1 no longer depends on dep-1');
    });

    it('should show task not found error when removing', async () => {
      mockRemoveTaskDependency.mockResolvedValue(null);

      await expect(dependAction('task-1', 'dep-1', { remove: true }))
        .rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});

describe('deps command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show task with dependencies', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Main Task' },
      status: 'open',
    };
    mockGetTask.mockResolvedValue(mockTask);
    mockGetTaskDependencies.mockResolvedValue([
      { id: 'dep-1', frontmatter: { title: 'Dependency 1' }, status: 'closed' },
      { id: 'dep-2', frontmatter: { title: 'Dependency 2' }, status: 'open' }
    ]);
    mockGetDependentTasks.mockResolvedValue([
      { id: 'dependent-1', frontmatter: { title: 'Dependent Task' }, status: 'in-progress' }
    ]);

    await depsAction('task-1');

    expect(mockGetTask).toHaveBeenCalledWith('task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Task: task-1 - Main Task');
    expect(mockConsoleLog).toHaveBeenCalledWith('Status: open');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nDependencies (2):');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nDepended on by (1):');
  });

  it('should show task without dependencies', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Standalone Task' },
      status: 'open',
    };
    mockGetTask.mockResolvedValue(mockTask);
    mockGetTaskDependencies.mockResolvedValue([]);
    mockGetDependentTasks.mockResolvedValue([]);

    await depsAction('task-1');

    expect(mockConsoleLog).toHaveBeenCalledWith('\nNo dependencies.');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nNo tasks depend on this.');
  });

  it('should show task not found error', async () => {
    mockGetTask.mockResolvedValue(null);

    await expect(depsAction('task-1'))
      .rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
