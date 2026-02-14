import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";

export const statusCommand: any = new Command()
  .name("status")
  .description("change the status of a task")
  .argument("<taskId>", "The id of the task to update")
  .argument("<status>", "The new status (open, in-progress, or closed)")
  .action(async (_options: any, taskId: string, status: string) => {
    const taskManager = new TaskManager();

    if (!["open", "in-progress", "closed"].includes(status)) {
      console.error("Invalid status. Must be one of: open, in-progress, closed");
      process.exit(1);
    }

    try {
      const task = await taskManager.changeTaskStatus(taskId, status as "open" | "in-progress" | "closed");

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Changed status of task ${task.id} to: ${task.status}`);
      console.log(`Title: ${task.frontmatter.title}`);
    } catch (error) {
      console.error("Failed to change task status:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
