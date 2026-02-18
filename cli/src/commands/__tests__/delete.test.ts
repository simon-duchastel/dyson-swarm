import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteAction } from '../delete.js';

// Mock the TaskManager
const mockDeleteTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    NotInitializedError: class NotInitializedError extends Error {},
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        deleteTask: mockDeleteTask,
      };
    }),
  };
});

// Mock @cliffy/prompt
vi.mock("@cliffy/prompt", function() {
  return {
    Confirm: {
      prompt: vi.fn(),
    },
  };
});

// Import the mocked module to access it
import { Confirm } from '@cliffy/prompt';
const mockConfirmPrompt = vi.mocked(Confirm.prompt);

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

  describe('with force flag', () => {
    it('should delete task with force flag', async () => {
      mockDeleteTask.mockResolvedValue(true);

      await deleteAction('task-1', { force: true });

      expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
      expect(mockConsoleLog).toHaveBeenCalledWith('Deleted task: task-1');
      expect(mockConfirmPrompt).not.toHaveBeenCalled();
    });

    it('should handle task not found', async () => {
      mockDeleteTask.mockResolvedValue(false);

      await expect(deleteAction('task-1', { force: true })).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle errors', async () => {
      mockDeleteTask.mockRejectedValue(new Error('Database error'));

      await expect(deleteAction('task-1', { force: true })).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to delete task:', 'Database error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('with interactive confirmation', () => {
    it('should prompt for confirmation when force not provided', async () => {
      mockDeleteTask.mockResolvedValue(true);
      mockConfirmPrompt.mockResolvedValue(true);

      await deleteAction('task-1', {});

      expect(mockConfirmPrompt).toHaveBeenCalledWith({
        message: 'Are you sure you want to delete task task-1?',
        default: false,
      });
      expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
      expect(mockConsoleLog).toHaveBeenCalledWith('Deleted task: task-1');
    });

    it('should cancel deletion when confirmation denied', async () => {
      mockConfirmPrompt.mockResolvedValue(false);

      await deleteAction('task-1', {});

      expect(mockConfirmPrompt).toHaveBeenCalledWith({
        message: 'Are you sure you want to delete task task-1?',
        default: false,
      });
      expect(mockDeleteTask).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('Deletion cancelled.');
    });

    it('should cancel deletion when force is explicitly false', async () => {
      await deleteAction('task-1', { force: false });

      expect(mockConfirmPrompt).not.toHaveBeenCalled();
      expect(mockDeleteTask).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('Deletion cancelled.');
    });
  });
});
