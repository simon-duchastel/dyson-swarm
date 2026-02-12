import { Command } from 'commander';
import { TaskManager } from '../../../lib/dist/index.js';

export const statusCommand = new Command('status')
  .description('Change the status of a task')
  .argument('<taskId>', 'Task ID')
  .argument('<status>', 'New status (open, in-progress, closed)')
  .action(async (taskId, status) => {
    const taskManager = new TaskManager();

    if (!['open', 'in-progress', 'closed'].includes(status)) {
      console.error('Invalid status. Must be one of: open, in-progress, closed');
      process.exit(1);
    }

    try {
      const task = await taskManager.changeTaskStatus(taskId, status);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Changed status of task ${task.id} to: ${task.status}`);
      console.log(`Title: ${task.frontmatter.title}`);
    } catch (error) {
      console.error('Failed to change task status:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
