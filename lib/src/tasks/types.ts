export type TaskStatus = 'draft' | 'open' | 'in-progress' | 'closed';

export interface TaskFrontmatter {
  title: string;
  assignee?: string; // Only present in in-progress or closed status
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
}

export interface UpdateTaskOptions {
  title?: string;
  description?: string;
  assignee?: string;
}

export interface TaskFilter {
  status?: TaskStatus;
}

export interface TaskManagerOptions {
  cwdProvider?: () => string;
}
