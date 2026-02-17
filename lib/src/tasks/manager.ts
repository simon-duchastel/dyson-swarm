import lock from 'proper-lockfile';
import { promises as fs, watchFile, unwatchFile, Stats } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskStatus, CreateTaskOptions, UpdateTaskOptions, TaskFilter, TaskManagerOptions } from './types.js';
import { TaskFileUtils } from './file-utils.js';
import { StatusUtils } from './status-utils.js';
import { ensureSchemaVersion } from './schema-version/index.js';
import {
  getLockfilePath,
  getTasksDir,
  getTaskDir,
  getTaskFile,
  getSubtasksDir,
  getSubtaskDir,
  getSubtaskFile,
  getStatusesDir,
} from '../paths.js';

export class TaskManager {
  private cwdProvider: () => string;

  constructor(options: TaskManagerOptions = {}) {
    this.cwdProvider = options.cwdProvider || (() => process.cwd());
  }

  /**
   * Execute an operation with the task lock held
   */
  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockfilePath = getLockfilePath(this.cwdProvider);
    
    // Ensure schema version is up to date
    await ensureSchemaVersion(this.cwdProvider);
    
    // Ensure tasks directory exists
    await TaskFileUtils.ensureDir(getTasksDir(this.cwdProvider));
    
    // Ensure status files exist
    await StatusUtils.initializeStatusFiles(this.cwdProvider);
    
    // Create the lockfile if it doesn't exist
    if (!(await TaskFileUtils.fileExists(lockfilePath))) {
      await fs.writeFile(lockfilePath, '', 'utf-8');
    }
    
    const release = await lock.lock(lockfilePath, {
      retries: {
        retries: 10,
        minTimeout: 100,
        maxTimeout: 1000,
      },
    });

    try {
      return await operation();
    } finally {
      await release();
    }
  }

  /**
   * Load a task from its file
   */
  private async loadTaskFromFile(taskId: string): Promise<Task | null> {
    // Use appropriate file getter for subtasks vs main tasks
    const taskFile = taskId.includes('/') 
      ? getSubtaskFile(taskId, this.cwdProvider)
      : getTaskFile(taskId, this.cwdProvider);
    
    if (!(await TaskFileUtils.fileExists(taskFile))) {
      return null;
    }

    try {
      const { frontmatter, description } = await TaskFileUtils.parseTaskFile(taskFile);
      const status = await StatusUtils.findTaskStatus(taskId, this.cwdProvider);
      
      if (!status) {
        return null;
      }
      
      return {
        id: taskId,
        frontmatter,
        description,
        status,
      };
    } catch (error) {
      throw new Error(`Failed to load task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load subtasks for a given task
   */
  private async loadSubtasks(parentId: string): Promise<Task[]> {
    const subtasksDir = getSubtasksDir(parentId, this.cwdProvider);
    const subtasks: Task[] = [];

    if (!(await TaskFileUtils.dirExists(subtasksDir))) {
      return subtasks;
    }

    const entries = await fs.readdir(subtasksDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subtaskId = entry.name;
        const fullyQualifiedId = `${parentId}/${subtaskId}`;
        const subtask = await this.loadSubtask(fullyQualifiedId);
        if (subtask) {
          subtasks.push(subtask);
        }
      }
    }

    return subtasks;
  }

  /**
   * Load a specific subtask using fully qualified ID
   */
  private async loadSubtask(fullyQualifiedId: string): Promise<Task | null> {
    const subtaskFile = getSubtaskFile(fullyQualifiedId, this.cwdProvider);
    
    if (!(await TaskFileUtils.fileExists(subtaskFile))) {
      return null;
    }

    try {
      const { frontmatter, description } = await TaskFileUtils.parseTaskFile(subtaskFile);
      const status = await StatusUtils.findTaskStatus(fullyQualifiedId, this.cwdProvider);
      
      if (!status) {
        return null;
      }
      
      return {
        id: fullyQualifiedId,
        frontmatter,
        description,
        status,
      };
    } catch (error) {
      throw new Error(`Failed to load subtask ${fullyQualifiedId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new task
   */
  async createTask(options: CreateTaskOptions): Promise<Task> {
    return this.withLock(async () => {
      const taskId = uuidv4();
      const status: TaskStatus = options.assignee ? 'in-progress' : 'open';
      
      let fullyQualifiedId: string;
      let task: Task;
      
      if (options.parentTaskId) {
        fullyQualifiedId = `${options.parentTaskId}/${taskId}`;
        task = {
          id: fullyQualifiedId,
          frontmatter: {
            title: options.title,
          },
          description: options.description,
          status: 'open',
        };
        
        const subtaskDir = getSubtaskDir(fullyQualifiedId, this.cwdProvider);
        const subtaskFile = getSubtaskFile(fullyQualifiedId, this.cwdProvider);
        
        await TaskFileUtils.ensureDir(subtaskDir);
        await TaskFileUtils.writeTaskFile(subtaskFile, task);
        
        await StatusUtils.addTaskToStatus(fullyQualifiedId, 'open', this.cwdProvider);
      } else {
        fullyQualifiedId = taskId;
        task = {
          id: taskId,
          frontmatter: {
            title: options.title,
            assignee: options.assignee,
          },
          description: options.description,
          status,
        };
        
        const taskDir = getTaskDir(taskId, this.cwdProvider);
        const taskFile = getTaskFile(taskId, this.cwdProvider);
        
        await TaskFileUtils.ensureDir(taskDir);
        await TaskFileUtils.writeTaskFile(taskFile, task);
        
        await StatusUtils.addTaskToStatus(taskId, status, this.cwdProvider);
      }

      return task;
    });
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    return this.withLock(async () => {
      // Check if it's a subtask (contains /)
      if (taskId.includes('/')) {
        return this.loadSubtask(taskId);
      }
      
      return this.loadTaskFromFile(taskId);
    });
  }

  /**
   * List tasks with optional filtering
   */
  async listTasks(filter: TaskFilter = {}): Promise<Task[]> {
    return this.withLock(async () => {
      const tasks: Task[] = [];
      const statuses: TaskStatus[] = filter.status ? [filter.status] : ['draft', 'open', 'in-progress', 'closed'];

      for (const status of statuses) {
        const taskIds = await StatusUtils.readStatusFile(status, this.cwdProvider);

        for (const taskId of taskIds) {
          const task = await this.loadTaskFromFile(taskId);
          if (task) {
            tasks.push(task);
          }
        }
      }

      return tasks;
    });
  }

  /**
   * List tasks with streaming updates when status files change
   * Returns an async generator that yields updated task lists
   */
  async *listTaskStream(filter: TaskFilter = {}): AsyncGenerator<Task[], void, unknown> {
    const statuses: TaskStatus[] = filter.status ? [filter.status] : ['draft', 'open', 'in-progress', 'closed'];
    const statusesDir = getStatusesDir(this.cwdProvider);
    const statusFiles = statuses.map(status => `${statusesDir}/${status}`);
    
    // Ensure all status files exist before watching
    for (const file of statusFiles) {
      if (!(await TaskFileUtils.fileExists(file))) {
        await TaskFileUtils.ensureDir(statusesDir);
        await fs.writeFile(file, '', 'utf-8');
      }
    }
    
    // Initial load
    yield await this.listTasks(filter);
    
    // Set up file watchers using fs.watchFile
    const watchers = new Set<string>();
    let changeResolve: (() => void) | null = null;
    
    const onFileChange = (curr: Stats, prev: Stats) => {
      if (curr.mtime !== prev.mtime && changeResolve) {
        changeResolve();
        changeResolve = null;
      }
    };
    
    try {
      // Start watching all status files
      for (const file of statusFiles) {
        watchFile(file, { interval: 100 }, onFileChange);
        watchers.add(file);
      }
      
      while (true) {
        // Wait for any file change
        await new Promise<void>((resolve) => {
          changeResolve = resolve;
        });
        
        // Yield updated task list
        yield await this.listTasks(filter);
      }
    } finally {
      // Clean up all watchers
      for (const file of watchers) {
        unwatchFile(file, onFileChange);
      }
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, options: UpdateTaskOptions): Promise<Task | null> {
    return this.withLock(async () => {
      // Check if it's a subtask
      const isSubtask = taskId.includes('/');
      
      let task: Task | null = null;
      let currentStatus: TaskStatus | null = null;
      
      if (isSubtask) {
        task = await this.loadSubtask(taskId);
      } else {
        task = await this.loadTaskFromFile(taskId);
      }

      if (!task) {
        return null;
      }
      
      currentStatus = task.status;

      // Update fields
      if (options.title !== undefined) {
        task.frontmatter.title = options.title;
      }
      if (options.description !== undefined) {
        task.description = options.description;
      }
      if (options.assignee !== undefined) {
        task.frontmatter.assignee = options.assignee;
      }

      // Update status based on assignee (for main tasks only)
      let newStatus = currentStatus;
      if (!isSubtask) {
        if (options.assignee && currentStatus === 'open') {
          newStatus = 'in-progress';
        } else if (options.assignee === undefined && (currentStatus === 'in-progress' || currentStatus === 'closed')) {
          newStatus = 'open';
          // Remove assignee when going back to open
          task.frontmatter.assignee = undefined;
        }
      }

      // If status changed, update status file
      if (newStatus !== currentStatus) {
        await StatusUtils.moveTaskStatus(taskId, currentStatus, newStatus, this.cwdProvider);
        task.status = newStatus;
      }

      // Write task file
      if (isSubtask) {
        const subtaskFile = getSubtaskFile(taskId, this.cwdProvider);
        await TaskFileUtils.writeTaskFile(subtaskFile, task);
      } else {
        const taskFile = getTaskFile(taskId, this.cwdProvider);
        await TaskFileUtils.writeTaskFile(taskFile, task);
      }

      return task;
    });
  }

  /**
   * Change task status
   */
  async changeTaskStatus(taskId: string, newStatus: TaskStatus): Promise<Task | null> {
    return this.withLock(async () => {
      const isSubtask = taskId.includes('/');
      
      let task: Task | null = null;
      
      if (isSubtask) {
        task = await this.loadSubtask(taskId);
      } else {
        task = await this.loadTaskFromFile(taskId);
      }

      if (!task) return null;
      
      const currentStatus = task.status;
      if (currentStatus === newStatus) return task;

      // Update status file
      await StatusUtils.moveTaskStatus(taskId, currentStatus, newStatus, this.cwdProvider);
      
      // Update task file
      task.status = newStatus;
      
      if (isSubtask) {
        const subtaskFile = getSubtaskFile(taskId, this.cwdProvider);
        await TaskFileUtils.writeTaskFile(subtaskFile, task);
      } else {
        const taskFile = getTaskFile(taskId, this.cwdProvider);
        await TaskFileUtils.writeTaskFile(taskFile, task);
      }

      return task;
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    return this.withLock(async () => {
      const isSubtask = taskId.includes('/');
      
      if (isSubtask) {
        // Delete subtask
        const subtaskFile = getSubtaskFile(taskId, this.cwdProvider);
        const subtaskDir = getSubtaskDir(taskId, this.cwdProvider);
        
        if (await TaskFileUtils.fileExists(subtaskFile)) {
          // Remove from status file
          const status = await StatusUtils.findTaskStatus(taskId, this.cwdProvider);
          if (status) {
            await StatusUtils.removeTaskFromStatus(taskId, status, this.cwdProvider);
          }
          
          // Delete files
          await fs.rm(subtaskDir, { recursive: true, force: true });
          return true;
        }
        return false;
      } else {
        // Delete main task and all subtasks
        const taskDir = getTaskDir(taskId, this.cwdProvider);
        
        if (await TaskFileUtils.dirExists(taskDir)) {
          // Remove main task from status file
          const status = await StatusUtils.findTaskStatus(taskId, this.cwdProvider);
          if (status) {
            await StatusUtils.removeTaskFromStatus(taskId, status, this.cwdProvider);
          }
          
          // Remove all subtasks from their status files
          const subtasks = await this.loadSubtasks(taskId);
          for (const subtask of subtasks) {
            await StatusUtils.removeTaskFromStatus(subtask.id, subtask.status, this.cwdProvider);
          }
          
          // Delete entire task directory
          await fs.rm(taskDir, { recursive: true, force: true });
          return true;
        }
        return false;
      }
    });
  }

  /**
   * Assign a task to someone
   */
  async assignTask(taskId: string, assignee: string): Promise<Task | null> {
    return this.updateTask(taskId, { assignee });
  }

  /**
   * Unassign a task
   */
  async unassignTask(taskId: string): Promise<Task | null> {
    return this.updateTask(taskId, { assignee: undefined });
  }
}
