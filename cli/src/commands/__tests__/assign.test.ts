import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignAction } from '../assign.js';

// Mock the TaskManager
const mockAssignTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    NotInitializedError: class NotInitializedError extends Error {},
    DependencyNotCompleteError: class DependencyNotCompleteError extends Error {
      constructor(message: string, public incompleteDependencies: Array<{ id: string; title: string; status: string }> = []) {
        super(message);
        this.name = 'DependencyNotCompleteError';
      }
    },
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        assignTask: mockAssignTask,
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

describe('assign command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with assignee provided via argument', () => {
    it('should assign task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task', assignee: 'john.doe' },
        status: 'in-progress',
      };
      mockAssignTask.mockResolvedValue(mockTask);

      await assignAction('task-1', 'john.doe');

      expect(mockAssignTask).toHaveBeenCalledWith('task-1', 'john.doe');
      expect(mockConsoleLog).toHaveBeenCalledWith('Assigned task task-1 to: john.doe');
      expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
      expect(mockConsoleLog).toHaveBeenCalledWith('Status: in-progress');
    });

    it('should handle task not found', async () => {
      mockAssignTask.mockResolvedValue(null);

      await expect(assignAction('task-1', 'john.doe')).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle errors', async () => {
      mockAssignTask.mockRejectedValue(new Error('Database error'));

      await expect(assignAction('task-1', 'john.doe')).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to assign task:', 'Database error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('without assignee provided', () => {
    it('should error when assignee is not provided', async () => {
      await expect(assignAction('task-1', undefined)).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Error: Assignee is required');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockAssignTask).not.toHaveBeenCalled();
    });
  });
});
