import { describe, it, expect, beforeEach, vi } from 'vitest';
import { statusAction } from '../status.js';

// Mock the TaskManager
const mocks = vi.hoisted(() => ({
  checkInitialization: vi.fn().mockResolvedValue({ isInitialized: true, missingComponents: [] }),
  changeTaskStatus: vi.fn(),
}));

vi.mock("dyson-swarm", () => ({
  checkInitialization: mocks.checkInitialization,
  TaskManager: vi.fn().mockImplementation(function() {
    return {
      changeTaskStatus: mocks.changeTaskStatus,
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

describe('status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should change status to closed', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Test Task' },
      status: 'closed',
    };
    mocks.changeTaskStatus.mockResolvedValue(mockTask);

    await statusAction('task-1', 'closed');

    expect(mocks.changeTaskStatus).toHaveBeenCalledWith('task-1', 'closed');
    expect(mockConsoleLog).toHaveBeenCalledWith('Changed status of task task-1 to: closed');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
  });

  it('should change status to in-progress', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Test Task' },
      status: 'in-progress',
    };
    mocks.changeTaskStatus.mockResolvedValue(mockTask);

    await statusAction('task-1', 'in-progress');

    expect(mocks.changeTaskStatus).toHaveBeenCalledWith('task-1', 'in-progress');
  });

  it('should change status to open', async () => {
    const mockTask = {
      id: 'task-1',
      frontmatter: { title: 'Test Task' },
      status: 'open',
    };
    mocks.changeTaskStatus.mockResolvedValue(mockTask);

    await statusAction('task-1', 'open');

    expect(mocks.changeTaskStatus).toHaveBeenCalledWith('task-1', 'open');
  });

  it('should handle invalid status', async () => {
    await expect(statusAction('task-1', 'invalid')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Invalid status. Must be one of: open, in-progress, closed');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle task not found', async () => {
    mocks.changeTaskStatus.mockResolvedValue(null);

    await expect(statusAction('task-1', 'closed')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors', async () => {
    mocks.changeTaskStatus.mockRejectedValue(new Error('Database error'));

    await expect(statusAction('task-1', 'closed')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to change task status:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
