import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";
import { requireInitialization } from "../utils/init-check.js";

export async function unassignAction(taskId: string) {
  await requireInitialization();
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
    console.error("Failed to unassign task:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const unassignCommand: any = new Command()
  .name("unassign")
  .description("Unassign a task.")
  .argument("<taskId>", "The id of the task to unassign.")
  .action(async (_options: any, taskId: string) => unassignAction(taskId));
