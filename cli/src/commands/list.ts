import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";

export async function listAction(options: any) {
  const taskManager = new TaskManager();

  try {
    const filter: any = {};

    if (options.status) {
      if (!["open", "in-progress", "closed"].includes(options.status)) {
        console.error("Invalid status. Must be one of: open, in-progress, closed");
        process.exit(1);
      }
      filter.status = options.status;
    }

    if (options.assignee) {
      filter.assignee = options.assignee;
    }

    const tasks = await taskManager.listTasks(filter);

    if (tasks.length === 0) {
      console.log("No tasks found.");
      return;
    }

    console.log(`Found ${tasks.length} task(s):\n`);

    for (const task of tasks) {
      console.log(`ID: ${task.id}`);
      console.log(`Title: ${task.frontmatter.title}`);
      console.log(`Status: ${task.status}`);
      if (task.frontmatter.assignee) {
        console.log(`Assignee: ${task.frontmatter.assignee}`);
      }
      console.log("---");
    }
  } catch (error) {
    console.error("Failed to list tasks:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const listCommand: any = new Command()
  .description("List tasks with optional filters.")
  .option("-s, --status <status>", "Filter by status (open, in-progress, closed).")
  .option("-a, --assignee <assignee>", "Filter by assignee.")
  .action(listAction);
