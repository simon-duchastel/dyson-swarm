import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAction } from '../get.js';

// Mock the TaskManager
const mockGetTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    TaskManager: vi.fn().mockImplementation(function() {
      return {
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

describe('get command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get a task successfully', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Test Task', assignee: 'john.doe' },
      status: 'in-progress',
      description: 'Task description',
      subtasks: [
        { frontmatter: { title: 'Subtask 1' }, status: 'open', description: 'Subtask desc' },
      ],
    };
    mockGetTask.mockResolvedValue(mockTask);

    await getAction('task-1');

    expect(mockGetTask).toHaveBeenCalledWith('task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('ID: task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
    expect(mockConsoleLog).toHaveBeenCalledWith('Status: in-progress');
    expect(mockConsoleLog).toHaveBeenCalledWith('Assignee: john.doe');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nDescription:');
    expect(mockConsoleLog).toHaveBeenCalledWith('Task description');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nSubtasks:');
  });

  it('should handle task without subtasks', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Simple Task' },
      status: 'open',
      description: 'Simple description',
    };
    mockGetTask.mockResolvedValue(mockTask);

    await getAction('task-1');

    expect(mockConsoleLog).toHaveBeenCalledWith('ID: task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Simple Task');
  });

  it('should handle task not found', async () => {
    mockGetTask.mockResolvedValue(null);

    await expect(getAction('non-existent')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: non-existent');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors', async () => {
    mockGetTask.mockRejectedValue(new Error('Database error'));

    await expect(getAction('task-1')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to get task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
