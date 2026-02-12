import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listAction } from '../list.js';

// Mock the TaskManager
const mockListTasks = vi.fn();

vi.mock('../../../../lib/dist/index.js', () => ({
  TaskManager: vi.fn().mockImplementation(() => ({
    listTasks: mockListTasks,
  })),
}));

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('list command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all tasks', async () => {
    const mockTasks = [
      { id: 'task-1', frontmatter: { title: 'Task 1' }, status: 'open' },
      { id: 'task-2', frontmatter: { title: 'Task 2', assignee: 'john.doe' }, status: 'in-progress' },
    ];
    mockListTasks.mockResolvedValue(mockTasks);

    await listAction({});

    expect(mockListTasks).toHaveBeenCalledWith({});
    expect(mockConsoleLog).toHaveBeenCalledWith('Found 2 task(s):\n');
    expect(mockConsoleLog).toHaveBeenCalledWith('ID: task-1');
    expect(mockConsoleLog).toHaveBeenCalledWith('ID: task-2');
  });

  it('should filter by status', async () => {
    const mockTasks = [
      { id: 'task-1', frontmatter: { title: 'Task 1' }, status: 'open' },
    ];
    mockListTasks.mockResolvedValue(mockTasks);

    await listAction({ status: 'open' });

    expect(mockListTasks).toHaveBeenCalledWith({ status: 'open' });
  });

  it('should filter by assignee', async () => {
    const mockTasks = [
      { id: 'task-1', frontmatter: { title: 'Task 1', assignee: 'john.doe' }, status: 'in-progress' },
    ];
    mockListTasks.mockResolvedValue(mockTasks);

    await listAction({ assignee: 'john.doe' });

    expect(mockListTasks).toHaveBeenCalledWith({ assignee: 'john.doe' });
  });

  it('should filter by hasSubtasks', async () => {
    const mockTasks = [
      { id: 'task-1', frontmatter: { title: 'Task 1' }, status: 'open', subtasks: [{ id: 'sub-1' }] },
    ];
    mockListTasks.mockResolvedValue(mockTasks);

    await listAction({ hasSubtasks: true });

    expect(mockListTasks).toHaveBeenCalledWith({ hasSubtasks: true });
  });

  it('should handle invalid status', async () => {
    await expect(listAction({ status: 'invalid' })).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Invalid status. Must be one of: open, in-progress, closed');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should show message when no tasks found', async () => {
    mockListTasks.mockResolvedValue([]);

    await listAction({});

    expect(mockConsoleLog).toHaveBeenCalledWith('No tasks found.');
  });

  it('should handle errors', async () => {
    mockListTasks.mockRejectedValue(new Error('Database error'));

    await expect(listAction({})).rejects.toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to list tasks:', 'Database error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
