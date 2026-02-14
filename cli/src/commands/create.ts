import { Command } from 'commander';
import { TaskManager } from "dyson-swarm";

// Export the action handler for testing
export async function createAction(options: {
  title: string;
  description: string;
  assignee?: string;
  subtasks?: string[];
}): Promise<void> {
  const taskManager = new TaskManager();
  
  const subtasks = options.subtasks?.map((title: string) => ({
    title,
    description: '',
  }));

  try {
    const task = await taskManager.createTask({
      title: options.title,
      description: options.description,
      assignee: options.assignee,
      subtasks,
    });

    console.log(`Created task: ${task.id}`);
    console.log(`Title: ${task.frontmatter.title}`);
    console.log(`Status: ${task.status}`);
    if (task.frontmatter.assignee) {
      console.log(`Assignee: ${task.frontmatter.assignee}`);
    }
    if (task.subtasks && task.subtasks.length > 0) {
      console.log(`Subtasks: ${task.subtasks.length}`);
    }
  } catch (error) {
    console.error('Failed to create task:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Export the command for the CLI
export const createCommand = new Command('create')
  .description('create a new task')
  .requiredOption('-t, --title <title>', 'Task title')
  .requiredOption('-d, --description <description>', 'Task description')
  .option('-a, --assignee <assignee>', 'Assignee username')
  .option('-s, --subtasks <subtasks...>', 'Subtask titles (can be specified multiple times)')
  .action(createAction);
