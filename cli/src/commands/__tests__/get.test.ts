import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAction } from '../get.js';

// Mock the TaskManager
const mocks = vi.hoisted(() => ({
  checkInitialization: vi.fn().mockResolvedValue({ isInitialized: true, missingComponents: [] }),
  getTask: vi.fn(),
}));

vi.mock("dyson-swarm", () => ({
  checkInitialization: mocks.checkInitialization,
  TaskManager: vi.fn().mockImplementation(function() {
    return {
      getTask: mocks.getTask,
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
    };
    mocks.getTask.mockResolvedValue(mockTask);

    await getAction('task-1');

    expect(mocks.getTask).toHaveBeenCalledWith('task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('ID: task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
    expect(mockConsoleLog).toHaveBeenCalledWith('Status: in-progress');
    expect(mockConsoleLog).toHaveBeenCalledWith('Assignee: john.doe');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nDescription:');
    expect(mockConsoleLog).toHaveBeenCalledWith('Task description');
  });



  it('should handle task not found', async () => {
    mocks.getTask.mockResolvedValue(null);

    await expect(getAction('non-existent')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: non-existent');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors', async () => {
    mocks.getTask.mockRejectedValue(new Error('Database error'));

    await expect(getAction('task-1')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to get task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
