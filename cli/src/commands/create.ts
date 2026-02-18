import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";
import { requireInitialization } from "../utils/init-check.js";

export async function createAction(options: any) {
  await requireInitialization();
  const taskManager = new TaskManager();

  try {
    const task = await taskManager.createTask({
      title: options.title,
      description: options.description,
      assignee: options.assignee,
      parentTaskId: options.parent,
    });

    console.log(`Created task: ${task.id}`);
    console.log(`Title: ${task.frontmatter.title}`);
    console.log(`Status: ${task.status}`);
    if (task.frontmatter.assignee) {
      console.log(`Assignee: ${task.frontmatter.assignee}`);
    }
    if (options.parent) {
      console.log(`Parent: ${options.parent}`);
    }
  } catch (error) {
    console.error("Failed to create task:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const createCommand: any = new Command()
  .description("Create a new task.")
  .option("-t, --title <title>", "Task title.", { required: true })
  .option("-d, --description <description>", "Task description.", { required: true })
  .option("-a, --assignee <assignee>", "Assignee username.")
  .option("-p, --parent <parentTaskId>", "Parent task ID to create a subtask.")
  .action(createAction);
