import { describe, it, expect, beforeEach, vi } from 'vitest';
import { statusAction } from '../status.js';

// Mock the TaskManager
const mockChangeTaskStatus = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    NotInitializedError: class NotInitializedError extends Error {},
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        changeTaskStatus: mockChangeTaskStatus,
      };
    }),
  };
});

// Mock @cliffy/prompt
vi.mock("@cliffy/prompt", function() {
  return {
    Select: {
      prompt: vi.fn(),
    },
  };
});

// Import the mocked module to access it
import { Select } from '@cliffy/prompt';
const mockSelectPrompt = vi.mocked(Select.prompt);

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

  describe('with status provided via argument', () => {
    it('should change status to closed', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task' },
        status: 'closed',
      };
      mockChangeTaskStatus.mockResolvedValue(mockTask);

      await statusAction('task-1', 'closed');

      expect(mockChangeTaskStatus).toHaveBeenCalledWith('task-1', 'closed');
      expect(mockConsoleLog).toHaveBeenCalledWith('Changed status of task task-1 to: closed');
      expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
      expect(mockSelectPrompt).not.toHaveBeenCalled();
    });

    it('should change status to in-progress', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task' },
        status: 'in-progress',
      };
      mockChangeTaskStatus.mockResolvedValue(mockTask);

      await statusAction('task-1', 'in-progress');

      expect(mockChangeTaskStatus).toHaveBeenCalledWith('task-1', 'in-progress');
    });

    it('should change status to open', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task' },
        status: 'open',
      };
      mockChangeTaskStatus.mockResolvedValue(mockTask);

      await statusAction('task-1', 'open');

      expect(mockChangeTaskStatus).toHaveBeenCalledWith('task-1', 'open');
    });

    it('should handle invalid status', async () => {
      await expect(statusAction('task-1', 'invalid')).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Invalid status. Must be one of: open, in-progress, closed');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle task not found', async () => {
      mockChangeTaskStatus.mockResolvedValue(null);

      await expect(statusAction('task-1', 'closed')).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle errors', async () => {
      mockChangeTaskStatus.mockRejectedValue(new Error('Database error'));

      await expect(statusAction('task-1', 'closed')).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to change task status:', 'Database error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('with interactive prompt', () => {
    it('should prompt for status when not provided', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task' },
        status: 'in-progress',
      };
      mockChangeTaskStatus.mockResolvedValue(mockTask);
      mockSelectPrompt.mockResolvedValue('in-progress');

      await statusAction('task-1', undefined);

      expect(mockSelectPrompt).toHaveBeenCalledWith({
        message: 'Select new status:',
        options: [
          { value: 'open', name: 'Open' },
          { value: 'in-progress', name: 'In Progress' },
          { value: 'closed', name: 'Closed' },
        ],
      });
      expect(mockChangeTaskStatus).toHaveBeenCalledWith('task-1', 'in-progress');
    });

    it('should use selected status from prompt', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Test Task' },
        status: 'closed',
      };
      mockChangeTaskStatus.mockResolvedValue(mockTask);
      mockSelectPrompt.mockResolvedValue('closed');

      await statusAction('task-1', undefined);

      expect(mockSelectPrompt).toHaveBeenCalled();
      expect(mockChangeTaskStatus).toHaveBeenCalledWith('task-1', 'closed');
      expect(mockConsoleLog).toHaveBeenCalledWith('Changed status of task task-1 to: closed');
    });
  });
});
