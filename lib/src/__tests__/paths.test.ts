import { describe, it, expect } from 'vitest';
import {
  getDysonDir,
  getLockfilePath,
  getStatusesDir,
  getStatusFile,
  getTasksDir,
  getTaskDir,
  getTaskFile,
  getSubtasksDir,
  getSubtaskDir,
  getSubtaskFile,
} from '../paths.js';

describe('paths', () => {
  const mockCwd = '/home/user/project';
  const cwdProvider = () => mockCwd;

  describe('getDysonDir', () => {
    it('should return the dyson directory path', () => {
      const result = getDysonDir(cwdProvider);
      expect(result).toBe('/home/user/project/.swarm');
    });

    it('should use process.cwd() when no provider given', () => {
      const result = getDysonDir();
      expect(result).toMatch(/\.swarm$/);
    });
  });

  describe('getLockfilePath', () => {
    it('should return the lockfile path', () => {
      const result = getLockfilePath(cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/lockfile');
    });
  });

  describe('getStatusesDir', () => {
    it('should return the statuses directory path', () => {
      const result = getStatusesDir(cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/statuses');
    });
  });

  describe('getStatusFile', () => {
    it('should return the status file path for each status', () => {
      expect(getStatusFile('draft', cwdProvider)).toBe('/home/user/project/.swarm/statuses/draft');
      expect(getStatusFile('open', cwdProvider)).toBe('/home/user/project/.swarm/statuses/open');
      expect(getStatusFile('in-progress', cwdProvider)).toBe('/home/user/project/.swarm/statuses/in-progress');
      expect(getStatusFile('closed', cwdProvider)).toBe('/home/user/project/.swarm/statuses/closed');
    });
  });

  describe('getTasksDir', () => {
    it('should return the tasks directory path', () => {
      const result = getTasksDir(cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks');
    });
  });

  describe('getTaskDir', () => {
    it('should return the task directory path', () => {
      const result = getTaskDir('task-123', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123');
    });
  });

  describe('getTaskFile', () => {
    it('should return the task file path', () => {
      const result = getTaskFile('task-123', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/task-123.task');
    });
  });

  describe('getSubtasksDir', () => {
    it('should return the subtasks directory for a top-level task', () => {
      const result = getSubtasksDir('task-123', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks');
    });

    it('should return the subtasks directory for a nested subtask', () => {
      const result = getSubtasksDir('task-123/sub-456', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks/sub-456/sub-tasks');
    });

    it('should handle deeply nested subtasks', () => {
      const result = getSubtasksDir('task-123/sub-456/sub-789', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks/sub-456/sub-tasks/sub-789/sub-tasks');
    });
  });

  describe('getSubtaskDir', () => {
    it('should return the subtask directory for a first-level subtask', () => {
      const result = getSubtaskDir('task-123/sub-456', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks/sub-456');
    });

    it('should return the subtask directory for a deeply nested subtask', () => {
      const result = getSubtaskDir('task-123/sub-456/sub-789', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks/sub-456/sub-tasks/sub-789');
    });

    it('should handle 4-level nesting', () => {
      const result = getSubtaskDir('level1/level2/level3/level4', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/level1/sub-tasks/level2/sub-tasks/level3/sub-tasks/level4');
    });
  });

  describe('getSubtaskFile', () => {
    it('should return the subtask file path for a first-level subtask', () => {
      const result = getSubtaskFile('task-123/sub-456', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks/sub-456/sub-456.task');
    });

    it('should return the subtask file path for a deeply nested subtask', () => {
      const result = getSubtaskFile('task-123/sub-456/sub-789', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/task-123/sub-tasks/sub-456/sub-tasks/sub-789/sub-789.task');
    });

    it('should handle 4-level nesting', () => {
      const result = getSubtaskFile('level1/level2/level3/level4', cwdProvider);
      expect(result).toBe('/home/user/project/.swarm/tasks/level1/sub-tasks/level2/sub-tasks/level3/sub-tasks/level4/level4.task');
    });
  });
});
