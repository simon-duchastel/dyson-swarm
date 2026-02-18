import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAction } from '../create.js';

// Mock the TaskManager
const mocks = vi.hoisted(() => ({
  createTask: vi.fn(),
}));

vi.mock("dyson-swarm", () => ({
  NotInitializedError: class NotInitializedError extends Error {},
  TaskManager: vi.fn().mockImplementation(function() {
    return {
      createTask: mocks.createTask,
    };
  }),
}));

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('create command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a task successfully', async () => {
    const mockTask = {
      id: 'test-task-id',
      frontmatter: { title: 'Test Task' },
      status: 'open',
    };
    mocks.createTask.mockResolvedValue(mockTask);

    await createAction({
      title: 'Test Task',
      description: 'Test Description',
    });

    expect(mocks.createTask).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      assignee: undefined,
      parentTaskId: undefined,
    });
    expect(mockConsoleLog).toHaveBeenCalledWith('Created task: test-task-id');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
    expect(mockConsoleLog).toHaveBeenCalledWith('Status: open');
  });

  it('should create a task with assignee', async () => {
    const mockTask = {
      id: 'test-task-id',
      frontmatter: { title: 'Test Task', assignee: 'john.doe' },
      status: 'in-progress',
    };
    mocks.createTask.mockResolvedValue(mockTask);

    await createAction({
      title: 'Test Task',
      description: 'Test Description',
      assignee: 'john.doe',
    });

    expect(mocks.createTask).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      assignee: 'john.doe',
      parentTaskId: undefined,
    });
    expect(mockConsoleLog).toHaveBeenCalledWith('Assignee: john.doe');
  });

  it('should create a subtask with parent', async () => {
    const mockTask = {
      id: 'parent-id/subtask-id',
      frontmatter: { title: 'Subtask' },
      status: 'open',
    };
    mocks.createTask.mockResolvedValue(mockTask);

    await createAction({
      title: 'Subtask',
      description: 'Test Description',
      parent: 'parent-id',
    });

    expect(mocks.createTask).toHaveBeenCalledWith({
      title: 'Subtask',
      description: 'Test Description',
      assignee: undefined,
      parentTaskId: 'parent-id',
    });
    expect(mockConsoleLog).toHaveBeenCalledWith('Created task: parent-id/subtask-id');
    expect(mockConsoleLog).toHaveBeenCalledWith('Parent: parent-id');
  });

  it('should handle errors', async () => {
    mocks.createTask.mockRejectedValue(new Error('Database error'));

    await expect(createAction({
      title: 'Test Task',
      description: 'Test Description',
    })).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to create task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
