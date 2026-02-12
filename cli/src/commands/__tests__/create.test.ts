import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAction } from '../create.js';

// Mock the TaskManager
const mockCreateTask = vi.fn();

vi.mock('../../../../lib/dist/index.js', () => ({
  TaskManager: vi.fn().mockImplementation(() => ({
    createTask: mockCreateTask,
  })),
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
      subtasks: [],
    };
    mockCreateTask.mockResolvedValue(mockTask);

    await createAction({
      title: 'Test Task',
      description: 'Test Description',
    });

    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      assignee: undefined,
      subtasks: undefined,
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
      subtasks: [],
    };
    mockCreateTask.mockResolvedValue(mockTask);

    await createAction({
      title: 'Test Task',
      description: 'Test Description',
      assignee: 'john.doe',
    });

    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      assignee: 'john.doe',
      subtasks: undefined,
    });
    expect(mockConsoleLog).toHaveBeenCalledWith('Assignee: john.doe');
  });

  it('should create a task with subtasks', async () => {
    const mockTask = {
      id: 'test-task-id',
      frontmatter: { title: 'Test Task' },
      status: 'open',
      subtasks: [{ frontmatter: { title: 'Subtask 1' } }, { frontmatter: { title: 'Subtask 2' } }],
    };
    mockCreateTask.mockResolvedValue(mockTask);

    await createAction({
      title: 'Test Task',
      description: 'Test Description',
      subtasks: ['Subtask 1', 'Subtask 2'],
    });

    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      assignee: undefined,
      subtasks: [
        { title: 'Subtask 1', description: '' },
        { title: 'Subtask 2', description: '' },
      ],
    });
    expect(mockConsoleLog).toHaveBeenCalledWith('Subtasks: 2');
  });

  it('should handle errors', async () => {
    mockCreateTask.mockRejectedValue(new Error('Database error'));

    await expect(createAction({
      title: 'Test Task',
      description: 'Test Description',
    })).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to create task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
