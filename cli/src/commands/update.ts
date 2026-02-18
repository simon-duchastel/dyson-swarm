import { Command } from "@cliffy/command";
import { TaskManager, NotInitializedError } from "dyson-swarm";

export async function updateAction(taskId: string, options: any) {
  const taskManager = new TaskManager();

  try {
    const updateOptions: any = {};

    if (options.title) updateOptions.title = options.title;
    if (options.description) updateOptions.description = options.description;
    if (options.assignee) updateOptions.assignee = options.assignee;

    if (Object.keys(updateOptions).length === 0) {
      console.error("No updates specified. Use --title, --description, or --assignee.");
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
    if (error instanceof NotInitializedError) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.error("Failed to update task:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const updateCommand: any = new Command()
  .name("update")
  .description("Update a task.")
  .argument("<taskId>", "The id of the task to update.")
  .option("-t, --title <title>", "New title.")
  .option("-d, --description <description>", "New description.")
  .option("-a, --assignee <assignee>", "New assignee.")
  .action(async (options: any, taskId: string) => updateAction(taskId, options));
