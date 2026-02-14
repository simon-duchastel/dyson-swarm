import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";

export const assignCommand: any = new Command()
  .name("assign")
  .description("assign a task to someone")
  .arguments("<taskId> <assignee>")
  .action(async (_options: any, taskId: string, assignee: string) => {
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
      console.error("Failed to assign task:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
