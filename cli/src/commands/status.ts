import { Command } from "@cliffy/command";
import { Select } from "@cliffy/prompt";
import { TaskManager, NotInitializedError } from "dyson-swarm";

export async function statusAction(taskId: string, status: string | undefined) {
  const taskManager = new TaskManager();

  const resolvedStatus = status ?? await Select.prompt({
    message: "Select new status:",
    options: [
      { value: "open", name: "Open" },
      { value: "in-progress", name: "In Progress" },
      { value: "closed", name: "Closed" },
    ],
  });

  if (!["open", "in-progress", "closed"].includes(resolvedStatus)) {
    console.error("Invalid status. Must be one of: open, in-progress, closed");
    process.exit(1);
  }

  try {
    const task = await taskManager.changeTaskStatus(taskId, resolvedStatus as "open" | "in-progress" | "closed");

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    console.log(`Changed status of task ${task.id} to: ${task.status}`);
    console.log(`Title: ${task.frontmatter.title}`);
  } catch (error) {
    if (error instanceof NotInitializedError) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.error("Failed to change task status:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const statusCommand: any = new Command()
  .name("status")
  .description("Change the status of a task.")
  .argument("<taskId>", "The id of the task to update.")
  .argument("[status]", "The new status (open, in-progress, or closed).")
  .action(async (_options: any, taskId: string, status: string | undefined) => statusAction(taskId, status));
