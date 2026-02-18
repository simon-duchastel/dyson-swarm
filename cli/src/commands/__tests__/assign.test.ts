import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignAction } from '../assign.js';

// Mock the TaskManager
const mockAssignTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    NotInitializedError: class NotInitializedError extends Error {},
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        assignTask: mockAssignTask,
      };
    }),
  };
});

// Mock @cliffy/prompt
vi.mock("@cliffy/prompt", function() {
  return {
    Input: {
      prompt: vi.fn(),
    },
  };
});

// Import the mocked module to access it
import { Input } from '@cliffy/prompt';
const mockInputPrompt = vi.mocked(Input.prompt);

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
      expect(mockInputPrompt).not.toHaveBeenCalled();
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

  describe('with interactive prompt', () => {
    it('should prompt for assignee when not provided', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task', assignee: 'jane.doe' },
        status: 'open',
      };
      mockAssignTask.mockResolvedValue(mockTask);
      mockInputPrompt.mockResolvedValue('jane.doe');

      await assignAction('task-1', undefined);

      expect(mockInputPrompt).toHaveBeenCalledWith({
        message: 'Enter assignee username:',
        minLength: 1,
      });
      expect(mockAssignTask).toHaveBeenCalledWith('task-1', 'jane.doe');
    });

    it('should use prompted assignee value', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task', assignee: 'prompted-user' },
        status: 'open',
      };
      mockAssignTask.mockResolvedValue(mockTask);
      mockInputPrompt.mockResolvedValue('prompted-user');

      await assignAction('task-1', undefined);

      expect(mockAssignTask).toHaveBeenCalledWith('task-1', 'prompted-user');
      expect(mockConsoleLog).toHaveBeenCalledWith('Assigned task task-1 to: prompted-user');
    });
  });
});
