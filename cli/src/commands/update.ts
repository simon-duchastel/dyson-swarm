import { Command } from "@cliffy/command";
import { TaskManager, NotInitializedError } from "dyson-swarm";

export async function updateAction(taskId: string, options: any) {
  const taskManager = new TaskManager();

  const updateOptions: any = {};

  if (options.title !== undefined) {
    updateOptions.title = options.title;
  }

  if (options.description !== undefined) {
    updateOptions.description = options.description;
  }

  if (options.assignee !== undefined) {
    updateOptions.assignee = options.assignee;
  }

  if (options.dependsOn !== undefined) {
    updateOptions.dependsOn = options.dependsOn.split(',').map((id: string) => id.trim()).filter(Boolean);
  }

  if (Object.keys(updateOptions).length === 0) {
    console.log("No updates specified. Task was not modified.");
    return;
  }

  try {
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
  .option("--depends-on <taskIds>", "Comma-separated list of task IDs this task depends on.")
  .action(async (options: any, taskId: string) => updateAction(taskId, options));
