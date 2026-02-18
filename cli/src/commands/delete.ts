import { Command } from "@cliffy/command";
import { TaskManager, NotInitializedError } from "dyson-swarm";

export async function deleteAction(taskId: string, options: any) {
  const taskManager = new TaskManager();

  if (!options.force) {
    console.log(`Are you sure you want to delete task ${taskId}?`);
    console.log("Use --force to skip this confirmation.");
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
    if (error instanceof NotInitializedError) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.error("Failed to delete task:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const deleteCommand: any = new Command()
  .name("delete")
  .description("Delete a task.")
  .argument("<taskId>", "The id of the task to delete.")
  .option("-f, --force", "Force deletion without confirmation.")
  .action(async (options: any, taskId: string) => deleteAction(taskId, options));
