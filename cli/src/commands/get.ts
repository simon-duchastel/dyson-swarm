import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";

export async function getAction(taskId: string) {
  const taskManager = new TaskManager();

  try {
    const task = await taskManager.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    console.log(`ID: ${task.id}`);
    console.log(`Title: ${task.frontmatter.title}`);
    console.log(`Status: ${task.status}`);
    if (task.frontmatter.assignee) {
      console.log(`Assignee: ${task.frontmatter.assignee}`);
    }
    console.log(`\nDescription:`);
    console.log(task.description);

    if (task.subtasks && task.subtasks.length > 0) {
      console.log(`\nSubtasks:`);
      for (const subtask of task.subtasks) {
        console.log(`  - ${subtask.frontmatter.title} (${subtask.status})`);
        if (subtask.description) {
          console.log(`    ${subtask.description}`);
        }
      }
    }
  } catch (error) {
    console.error("Failed to get task:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const getCommand: any = new Command()
  .name("get")
  .description("Get a specific task by ID.")
  .argument("<taskId>", "The id of the task to get.")
  .action(async (_options: any, taskId: string) => getAction(taskId));
