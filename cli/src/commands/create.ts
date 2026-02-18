import { Command } from "@cliffy/command";
import { Input } from "@cliffy/prompt";
import { TaskManager, NotInitializedError } from "dyson-swarm";

export async function createAction(options: any) {
  const taskManager = new TaskManager();

  try {
    const title = options.title ?? await Input.prompt({
      message: "Enter task title:",
      minLength: 1,
    });

    const description = options.description ?? await Input.prompt({
      message: "Enter task description:",
      minLength: 1,
    });

    const assignee = options.assignee ?? await Input.prompt({
      message: "Enter assignee (optional):",
    });

    const parent = options.parent ?? await Input.prompt({
      message: "Enter parent task ID (optional):",
    });

    const task = await taskManager.createTask({
      title,
      description,
      assignee: assignee || undefined,
      parentTaskId: parent || undefined,
    });

    console.log(`Created task: ${task.id}`);
    console.log(`Title: ${task.frontmatter.title}`);
    console.log(`Status: ${task.status}`);
    if (task.frontmatter.assignee) {
      console.log(`Assignee: ${task.frontmatter.assignee}`);
    }
    if (parent) {
      console.log(`Parent: ${parent}`);
    }
  } catch (error) {
    if (error instanceof NotInitializedError) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.error("Failed to create task:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const createCommand: any = new Command()
  .description("Create a new task.")
  .option("-t, --title <title>", "Task title.", { required: true })
  .allowEmpty()
  .option("-d, --description <description>", "Task description.", { required: true })
  .allowEmpty()
  .option("-a, --assignee <assignee>", "Assignee username.")
  .option("-p, --parent <parentTaskId>", "Parent task ID to create a subtask.")
  .action(createAction);
