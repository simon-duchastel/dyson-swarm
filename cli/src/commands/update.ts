import { Command } from 'commander';
import { TaskManager } from '../../../lib/dist/index.js';

export const updateCommand = new Command('update')
  .description('Update a task')
  .argument('<taskId>', 'Task ID')
  .option('-t, --title <title>', 'New title')
  .option('-d, --description <description>', 'New description')
  .option('-a, --assignee <assignee>', 'New assignee')
  .action(async (taskId, options) => {
    const taskManager = new TaskManager();

    try {
      const updateOptions: {
        title?: string;
        description?: string;
        assignee?: string;
      } = {};

      if (options.title) {
        updateOptions.title = options.title;
      }

      if (options.description) {
        updateOptions.description = options.description;
      }

      if (options.assignee) {
        updateOptions.assignee = options.assignee;
      }

      if (Object.keys(updateOptions).length === 0) {
        console.error('No updates specified. Use --title, --description, or --assignee.');
        process.exit(1);
      }

      const task = await taskManager.updateTask(taskId, updateOptions);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Updated task: ${task.id}`);
      console.log(`Title: ${task.frontmatter.title}`);
      console.log(`Status: ${task.status}`);
      if (task.frontmatter.assignee) {
        console.log(`Assignee: ${task.frontmatter.assignee}`);
      }
    } catch (error) {
      console.error('Failed to update task:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
