import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";

export async function createAction(options: any) {
  const taskManager = new TaskManager();
  const subtasks = options.subtasks?.map((title: string) => ({
    title,
    description: "",
  }));

  try {
    const task = await taskManager.createTask({
      title: options.title,
      description: options.description,
      assignee: options.assignee,
      subtasks,
    });

    console.log(`Created task: ${task.id}`);
    console.log(`Title: ${task.frontmatter.title}`);
    console.log(`Status: ${task.status}`);
    if (task.frontmatter.assignee) {
      console.log(`Assignee: ${task.frontmatter.assignee}`);
    }
    if (task.subtasks && task.subtasks.length > 0) {
      console.log(`Subtasks: ${task.subtasks.length}`);
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
  .option("-s, --subtasks <subtasks...>", "Subtask titles, can be specified multiple times.")
  .action(createAction);
