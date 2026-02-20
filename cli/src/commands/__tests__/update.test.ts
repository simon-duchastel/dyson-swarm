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

  describe('with options provided via flags', () => {
    it('should update task title', async () => {
      const mockTask = {
        id: 'task-1',
        frontmatter: { title: 'New Title' },
        status: 'open',
      };
      mockUpdateTask.mockResolvedValue(mockTask);

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

  describe('without options provided', () => {
    it('should skip update when no options provided', async () => {
      await updateAction('task-1', {});

      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('No updates specified. Task was not modified.');
    });
  });
});
