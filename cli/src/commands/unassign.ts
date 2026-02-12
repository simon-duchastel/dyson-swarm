import { Command } from 'commander';
import { TaskManager } from '../../../lib/dist/index.js';

export const unassignCommand = new Command('unassign')
  .description('Unassign a task')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId) => {
    const taskManager = new TaskManager();

    try {
      const task = await taskManager.unassignTask(taskId);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Unassigned task: ${task.id}`);
      console.log(`Title: ${task.frontmatter.title}`);
      console.log(`Status: ${task.status}`);
    } catch (error) {
      console.error('Failed to unassign task:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
