import { Command } from 'commander';
import { TaskManager } from '../../../lib/dist/index.js';

// Export the action handler for testing
export async function deleteAction(taskId: string, options: {
  force?: boolean;
}): Promise<void> {
  const taskManager = new TaskManager();

  if (!options.force) {
    console.log(`Are you sure you want to delete task ${taskId}?`);
    console.log('Use --force to skip this confirmation.');
    // In a real implementation, you might want to add an interactive prompt here
    process.exit(1);
  }

  try {
    const deleted = await taskManager.deleteTask(taskId);

    if (!deleted) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    console.log(`Deleted task: ${taskId}`);
  } catch (error) {
    console.error('Failed to delete task:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Export the command for the CLI
export const deleteCommand = new Command('delete')
  .description('Delete a task')
  .argument('<taskId>', 'Task ID')
  .option('-f, --force', 'Force deletion without confirmation')
  .action(deleteAction);
