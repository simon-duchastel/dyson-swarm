import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAction } from '../create.js';

// Mock the TaskManager
const mockCreateTask = vi.fn();

vi.mock("dyson-swarm", function() {
  return {
    TaskManager: vi.fn().mockImplementation(function() {
      return {
        createTask: mockCreateTask,
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

describe('create command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with all options provided via flags', () => {
    it('should create a task successfully', async () => {
      const mockTask = {
        id: 'test-task-id',
        frontmatter: { title: 'Test Task' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);

      await createAction({
        title: 'Test Task',
        description: 'Test Description',
      });

      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        assignee: undefined,
        parentTaskId: undefined,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('Created task: test-task-id');
      expect(mockConsoleLog).toHaveBeenCalledWith('Title: Test Task');
      expect(mockConsoleLog).toHaveBeenCalledWith('Status: open');
    });

    it('should create a task with assignee', async () => {
      const mockTask = {
        id: 'test-task-id',
        frontmatter: { title: 'Test Task', assignee: 'john.doe' },
        status: 'in-progress',
      };
      mockCreateTask.mockResolvedValue(mockTask);

      await createAction({
        title: 'Test Task',
        description: 'Test Description',
        assignee: 'john.doe',
      });

      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        assignee: 'john.doe',
        parentTaskId: undefined,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('Assignee: john.doe');
    });

    it('should create a subtask with parent', async () => {
      const mockTask = {
        id: 'parent-id/subtask-id',
        frontmatter: { title: 'Subtask' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);

      await createAction({
        title: 'Subtask',
        description: 'Test Description',
        parent: 'parent-id',
      });

      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Subtask',
        description: 'Test Description',
        assignee: undefined,
        parentTaskId: 'parent-id',
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('Created task: parent-id/subtask-id');
      expect(mockConsoleLog).toHaveBeenCalledWith('Parent: parent-id');
    });

    it('should handle errors', async () => {
      mockCreateTask.mockRejectedValue(new Error('Database error'));

      await expect(createAction({
        title: 'Test Task',
        description: 'Test Description',
      })).rejects.toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to create task:', 'Database error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('with interactive prompts', () => {
    it('should prompt for title and description when not provided', async () => {
      const mockTask = {
        id: 'test-task-id',
        frontmatter: { title: 'Prompted Title' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('Prompted Title')
        .mockResolvedValueOnce('Prompted Description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('');

      await createAction({});

      expect(mockInputPrompt).toHaveBeenCalledTimes(4);
      expect(mockInputPrompt).toHaveBeenNthCalledWith(1, {
        message: 'Enter task title:',
        minLength: 1,
      });
      expect(mockInputPrompt).toHaveBeenNthCalledWith(2, {
        message: 'Enter task description:',
        minLength: 1,
      });
      expect(mockInputPrompt).toHaveBeenNthCalledWith(3, {
        message: 'Enter assignee (optional):',
      });
      expect(mockInputPrompt).toHaveBeenNthCalledWith(4, {
        message: 'Enter parent task ID (optional):',
      });
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Prompted Title',
        description: 'Prompted Description',
        assignee: undefined,
        parentTaskId: undefined,
      });
    });

    it('should prompt for assignee when not provided and use value', async () => {
      const mockTask = {
        id: 'test-task-id',
        frontmatter: { title: 'Test Task', assignee: 'jane.doe' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('Test Task')
        .mockResolvedValueOnce('Test Description')
        .mockResolvedValueOnce('jane.doe')
        .mockResolvedValueOnce('');

      await createAction({});

      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        assignee: 'jane.doe',
        parentTaskId: undefined,
      });
    });

    it('should prompt for parent when not provided and use value', async () => {
      const mockTask = {
        id: 'parent-id/subtask-id',
        frontmatter: { title: 'Subtask' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('Subtask')
        .mockResolvedValueOnce('Test Description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('parent-id');

      await createAction({});

      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Subtask',
        description: 'Test Description',
        assignee: undefined,
        parentTaskId: 'parent-id',
      });
    });

    it('should use flag values for assignee and parent without prompting', async () => {
      const mockTask = {
        id: 'test-task-id',
        frontmatter: { title: 'Test Task', assignee: 'flag-assignee' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('Test Task')
        .mockResolvedValueOnce('Test Description');

      await createAction({
        assignee: 'flag-assignee',
        parent: 'flag-parent',
      });

      expect(mockInputPrompt).toHaveBeenCalledTimes(2);
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        assignee: 'flag-assignee',
        parentTaskId: 'flag-parent',
      });
    });

    it('should mix flag and prompt values', async () => {
      const mockTask = {
        id: 'test-task-id',
        frontmatter: { title: 'Flag Title', assignee: 'prompted-assignee' },
        status: 'open',
      };
      mockCreateTask.mockResolvedValue(mockTask);
      mockInputPrompt
        .mockResolvedValueOnce('Prompted Description')
        .mockResolvedValueOnce('prompted-assignee')
        .mockResolvedValueOnce('');

      await createAction({
        title: 'Flag Title',
      });

      expect(mockInputPrompt).toHaveBeenCalledTimes(3);
      expect(mockInputPrompt).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Enter task title:' })
      );
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Flag Title',
        description: 'Prompted Description',
        assignee: 'prompted-assignee',
        parentTaskId: undefined,
      });
    });
  });
});
