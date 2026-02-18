import { Command } from "@cliffy/command";
import { Input } from "@cliffy/prompt";
import { TaskManager } from "dyson-swarm";

export async function assignAction(taskId: string, assignee: string | undefined) {
  const taskManager = new TaskManager();

  const resolvedAssignee = assignee ?? await Input.prompt({
    message: "Enter assignee username:",
    minLength: 1,
  });

  try {
    const task = await taskManager.assignTask(taskId, resolvedAssignee);

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
}

export const assignCommand: any = new Command()
  .name("assign")
  .description("Assign a task to someone.")
  .argument("<taskId>", "The id of the task to add an assignee to.")
  .argument("[assignee]", "The assignee to assign the task to.")
  .action(async (_options: any, taskId: string, assignee: string | undefined) => assignAction(taskId, assignee));
