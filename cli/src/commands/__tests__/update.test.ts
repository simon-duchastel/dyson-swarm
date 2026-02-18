import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateAction } from '../update.js';

// Mock the TaskManager
const mockUpdateTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    NotInitializedError: class NotInitializedError extends Error {},
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        updateTask: mockUpdateTask,
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

describe('update command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with all options provided via flags', () => {
    it('should update task title', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'New Title' },
        status: 'open',
      };
      mockUpdateTask.mockResolvedValue(mockTask);
      mockInputPrompt.mockResolvedValueOnce('').mockResolvedValueOnce('');

      await updateAction('task-1', { title: 'New Title' });

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'New Title' });
      expect(mockConsoleLog).toHaveBeenCalledWith('Updated task: task-1');
      expect(mockConsoleLog).toHaveBeenCalledWith('Title: New Title');
    });

    it('should update task description', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Task' },
        status: 'open',
        description: 'New description',
      };
      mockUpdateTask.mockResolvedValue(mockTask);

      await updateAction('task-1', { description: 'New description' });

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { description: 'New description' });
    });

    it('should update task assignee', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Task', assignee: 'jane.doe' },
        status: 'in-progress',
      };
      mockUpdateTask.mockResolvedValue(mockTask);

      await updateAction('task-1', { assignee: 'jane.doe' });

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { assignee: 'jane.doe' });
      expect(mockConsoleLog).toHaveBeenCalledWith('Assignee: jane.doe');
    });

    it('should update multiple fields', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'New Title', assignee: 'john.doe' },
        status: 'in-progress',
        description: 'New description',
      };
      mockUpdateTask.mockResolvedValue(mockTask);

      await updateAction('task-1', { title: 'New Title', description: 'New description', assignee: 'john.doe' });

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', {
        title: 'New Title',
        description: 'New description',
        assignee: 'john.doe',
      });
    });

    it('should handle task not found', async () => {
      mockUpdateTask.mockResolvedValue(null);

      await expect(updateAction('task-1', { title: 'New Title' })).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Task not found: task-1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle errors', async () => {
      mockUpdateTask.mockRejectedValue(new Error('Database error'));

      await expect(updateAction('task-1', { title: 'New Title' })).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to update task:', 'Database error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('with interactive prompts', () => {
    it('should prompt for all fields when no options provided', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'New Title', assignee: 'jane.doe' },
        status: 'open',
        description: 'New desc',
      };
      mockUpdateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('New Title')
        .mockResolvedValueOnce('New desc')
        .mockResolvedValueOnce('jane.doe');

      await updateAction('task-1', {});

      expect(mockInputPrompt).toHaveBeenCalledTimes(3);
      expect(mockInputPrompt).toHaveBeenNthCalledWith(1, {
        message: 'New title (optional, press Enter to skip):',
      });
      expect(mockInputPrompt).toHaveBeenNthCalledWith(2, {
        message: 'New description (optional, press Enter to skip):',
      });
      expect(mockInputPrompt).toHaveBeenNthCalledWith(3, {
        message: 'New assignee (optional, press Enter to skip):',
      });
    });

    it('should skip update when all prompts return empty', async () => {
      mockInputPrompt
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('');

      await updateAction('task-1', {});

      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('No updates specified. Task was not modified.');
    });

    it('should only update fields with non-empty prompt values', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Updated Title' },
        status: 'open',
      };
      mockUpdateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('Updated Title')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('');

      await updateAction('task-1', {});

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated Title' });
    });

    it('should not prompt for fields provided via flags', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Flag Title' },
        status: 'open',
      };
      mockUpdateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('');

      await updateAction('task-1', { title: 'Flag Title' });

      expect(mockInputPrompt).toHaveBeenCalledTimes(2);
      expect(mockInputPrompt).toHaveBeenNthCalledWith(1, {
        message: 'New description (optional, press Enter to skip):',
      });
      expect(mockInputPrompt).toHaveBeenNthCalledWith(2, {
        message: 'New assignee (optional, press Enter to skip):',
      });
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Flag Title' });
    });

    it('should mix flag values and prompt values', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'Flag Title', assignee: 'Prompted Assignee' },
        status: 'open',
      };
      mockUpdateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Prompted Assignee');

      await updateAction('task-1', { title: 'Flag Title' });

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', {
        title: 'Flag Title',
        assignee: 'Prompted Assignee',
      });
    });
  });
});
