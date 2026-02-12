import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignAction } from '../assign.js';

// Mock the TaskManager
const mockAssignTask = vi.fn();

vi.mock('../../../../lib/dist/index.js', () => ({
  TaskManager: vi.fn().mockImplementation(() => ({
    assignTask: mockAssignTask,
  })),
}));

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
