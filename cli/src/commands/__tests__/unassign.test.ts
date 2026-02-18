import { describe, it, expect, beforeEach, vi } from 'vitest';
import { unassignAction } from '../unassign.js';

// Mock the TaskManager
const mocks = vi.hoisted(() => ({
  unassignTask: vi.fn(),
}));

vi.mock("dyson-swarm", () => ({
  NotInitializedError: class NotInitializedError extends Error {},
  TaskManager: vi.fn().mockImplementation(function() {
    return {
      unassignTask: mocks.unassignTask,
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

describe('unassign command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unassign task successfully', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Test Task' },
      status: 'open',
    };
    mocks.unassignTask.mockResolvedValue(mockTask);

    await unassignAction('task-1');

    expect(mocks.unassignTask).toHaveBeenCalledWith('task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Unassigned task: task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
    expect(mockConsoleLog).toHaveBeenCalledWith('Status: open');
  });

  it('should handle task not found', async () => {
    mocks.unassignTask.mockResolvedValue(null);

    await expect(unassignAction('task-1')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors', async () => {
    mocks.unassignTask.mockRejectedValue(new Error('Database error'));

    await expect(unassignAction('task-1')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to unassign task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
