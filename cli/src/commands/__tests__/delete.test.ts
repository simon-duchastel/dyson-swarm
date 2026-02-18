import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteAction } from '../delete.js';

// Mock the TaskManager
const mocks = vi.hoisted(() => ({
  deleteTask: vi.fn(),
}));

vi.mock("dyson-swarm", () => ({
  NotInitializedError: class NotInitializedError extends Error {},
  TaskManager: vi.fn().mockImplementation(function() {
    return {
      deleteTask: mocks.deleteTask,
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

describe('delete command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete task with force flag', async () => {
    mocks.deleteTask.mockResolvedValue(true);

    await deleteAction('task-1', { force: true });

    expect(mocks.deleteTask).toHaveBeenCalledWith('task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Deleted task: task-1');
  });

  it('should require force flag', async () => {
    await expect(deleteAction('task-1', { force: false })).rejects.toThrow('process.exit called');

    expect(mockConsoleLog).toHaveBeenCalledWith('Are you sure you want to delete task task-1?');
    expect(mockConsoleLog).toHaveBeenCalledWith('Use --force to skip this confirmation.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle task not found', async () => {
    mocks.deleteTask.mockResolvedValue(false);

    await expect(deleteAction('task-1', { force: true })).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors', async () => {
    mocks.deleteTask.mockRejectedValue(new Error('Database error'));

    await expect(deleteAction('task-1', { force: true })).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to delete task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
