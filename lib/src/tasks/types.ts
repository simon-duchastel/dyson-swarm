export type TaskStatus = 'draft' | 'open' | 'in-progress' | 'closed';

export interface TaskFrontmatter {
  title: string;
  assignee?: string; // Only present in in-progress or closed status
  dependsOn?: string[]; // Array of task IDs this task depends on
}

export interface Task {
  id: string;
  frontmatter: TaskFrontmatter;
  description: string;
  status: TaskStatus;
}

export interface CreateTaskOptions {
  title: string;
  description: string;
  assignee?: string;
  parentTaskId?: string;
  dependsOn?: string[];
}

export interface UpdateTaskOptions {
  title?: string;
  description?: string;
  assignee?: string;
  dependsOn?: string[];
}

export interface TaskFilter {
  status?: TaskStatus;
  taskId?: string;
  dependsOn?: string;
}

export interface TaskManagerOptions {
  cwdProvider?: () => string;
}
