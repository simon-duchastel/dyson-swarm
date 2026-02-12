import { Command } from 'commander';
import { TaskManager } from "dyson-swarm";

// Export the action handler for testing
export async function listAction(options: {
  status?: string;
  assignee?: string;
  hasSubtasks?: boolean;
}): Promise<void> {
  const taskManager = new TaskManager();

  try {
    const filter: {
      status?: 'open' | 'in-progress' | 'closed';
      assignee?: string;
      hasSubtasks?: boolean;
    } = {};

    if (options.status) {
      if (!['open', 'in-progress', 'closed'].includes(options.status)) {
        console.error('Invalid status. Must be one of: open, in-progress, closed');
        process.exit(1);
      }
      filter.status = options.status as 'open' | 'in-progress' | 'closed';
    }

    if (options.assignee) {
      filter.assignee = options.assignee;
    }

    if (options.hasSubtasks !== undefined) {
      filter.hasSubtasks = options.hasSubtasks;
    }

    const tasks = await taskManager.listTasks(filter);

    if (tasks.length === 0) {
      console.log('No tasks found.');
      return;
    }

    console.log(`Found ${tasks.length} task(s):\n`);

    for (const task of tasks) {
      console.log(`ID: ${task.id}`);
      console.log(`Title: ${task.frontmatter.title}`);
      console.log(`Status: ${task.status}`);
      if (task.frontmatter.assignee) {
        console.log(`Assignee: ${task.frontmatter.assignee}`);
      }
      if (task.subtasks && task.subtasks.length > 0) {
        console.log(`Subtasks: ${task.subtasks.length}`);
      }
      console.log('---');
    }
  } catch (error) {
    console.error('Failed to list tasks:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Export the command for the CLI
export const listCommand = new Command('list')
  .description('List tasks with optional filters')
  .option('-s, --status <status>', 'Filter by status (open, in-progress, closed)')
  .option('-a, --assignee <assignee>', 'Filter by assignee')
  .option('--has-subtasks', 'Filter tasks that have subtasks')
  .option('--no-subtasks', 'Filter tasks that have no subtasks')
  .action(listAction);
