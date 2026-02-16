import { describe, it, expect, beforeEach, vi } from 'vitest';
import { unassignAction } from '../unassign.js';

// Mock the TaskManager
const mockUnassignTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        unassignTask: mockUnassignTask,
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
    mockUnassignTask.mockResolvedValue(mockTask);

    await unassignAction('task-1');

    expect(mockUnassignTask).toHaveBeenCalledWith('task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Unassigned task: task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
    expect(mockConsoleLog).toHaveBeenCalledWith('Status: open');
  });

  it('should handle task not found', async () => {
    mockUnassignTask.mockResolvedValue(null);

    await expect(unassignAction('task-1')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors', async () => {
    mockUnassignTask.mockRejectedValue(new Error('Database error'));

    await expect(unassignAction('task-1')).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to unassign task:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
