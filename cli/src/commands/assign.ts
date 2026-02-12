import { Command } from 'commander';
import { TaskManager } from '../../../lib/dist/index.js';

export const assignCommand = new Command('assign')
  .description('Assign a task to someone')
  .argument('<taskId>', 'Task ID')
  .argument('<assignee>', 'Assignee username')
  .action(async (taskId, assignee) => {
    const taskManager = new TaskManager();

    try {
      const task = await taskManager.assignTask(taskId, assignee);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Assigned task ${task.id} to: ${task.frontmatter.assignee}`);
      console.log(`Title: ${task.frontmatter.title}`);
      console.log(`Status: ${task.status}`);
    } catch (error) {
      console.error('Failed to assign task:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
