#!/usr/bin/env node

import { Command } from "@cliffy/command";
import { TaskManager } from "dyson-swarm";

// Check for --help-simple before creating the program
const args = process.argv;
const showSimpleHelp = args.includes("--help-simple");

// Create main command
const program = new Command()
  .name("swarm")
  .description("A markdown-based issue tracking system CLI")
  .version("1.0.0")
  .globalOption("--help-simple", "Show simple command list only");

// Create command
program
  .command("create", "create a new task")
  .option("-t, --title <title>", "Task title", { required: true })
  .option("-d, --description <description>", "Task description", { required: true })
  .option("-a, --assignee <assignee>", "Assignee username")
  .option("-s, --subtasks <subtasks...>", "Subtask titles (can be specified multiple times)")
  .action(async (options) => {
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
  });

// List command
program
  .command("list", "list tasks with optional filters")
  .option("-s, --status <status>", "Filter by status (open, in-progress, closed)")
  .option("-a, --assignee <assignee>", "Filter by assignee")
  .option("--has-subtasks", "Filter tasks that have subtasks")
  .option("--no-subtasks", "Filter tasks that have no subtasks")
  .action(async (options) => {
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

      if (options.hasSubtasks !== undefined) {
        filter.hasSubtasks = options.hasSubtasks;
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
        if (task.subtasks && task.subtasks.length > 0) {
          console.log(`Subtasks: ${task.subtasks.length}`);
        }
        console.log("---");
      }
    } catch (error) {
      console.error("Failed to list tasks:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Get command
program
  .command("get <taskId>", "get a specific task by ID")
  .action(async (_options, taskId: string) => {
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
  });

// Update command
program
  .command("update <taskId>", "update a task")
  .option("-t, --title <title>", "New title")
  .option("-d, --description <description>", "New description")
  .option("-a, --assignee <assignee>", "New assignee")
  .action(async (options, taskId: string) => {
    const taskManager = new TaskManager();

    try {
      const updateOptions: any = {};

      if (options.title) updateOptions.title = options.title;
      if (options.description) updateOptions.description = options.description;
      if (options.assignee) updateOptions.assignee = options.assignee;

      if (Object.keys(updateOptions).length === 0) {
        console.error("No updates specified. Use --title, --description, or --assignee.");
        process.exit(1);
      }

      const task = await taskManager.updateTask(taskId, updateOptions);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Updated task: ${task.id}`);
      console.log(`Title: ${task.frontmatter.title}`);
      console.log(`Status: ${task.status}`);
      if (task.frontmatter.assignee) {
        console.log(`Assignee: ${task.frontmatter.assignee}`);
      }
    } catch (error) {
      console.error("Failed to update task:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command("status <taskId> <status>", "change the status of a task")
  .action(async (_options, taskId: string, status: string) => {
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

// Assign command
program
  .command("assign <taskId> <assignee>", "assign a task to someone")
  .action(async (_options, taskId: string, assignee: string) => {
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

// Unassign command
program
  .command("unassign <taskId>", "unassign a task")
  .action(async (_options, taskId: string) => {
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
  });

// Delete command
program
  .command("delete <taskId>", "delete a task")
  .option("-f, --force", "Force deletion without confirmation")
  .action(async (options, taskId: string) => {
    const taskManager = new TaskManager();

    if (!options.force) {
      console.log(`Are you sure you want to delete task ${taskId}?`);
      console.log("Use --force to skip this confirmation.");
      process.exit(1);
    }

    try {
      const deleted = await taskManager.deleteTask(taskId);

      if (!deleted) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Deleted task: ${taskId}`);
    } catch (error) {
      console.error("Failed to delete task:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Custom help formatting for flat output
if (!showSimpleHelp) {
  program.help(() => {
    const sections: string[] = [];

    // Header
    sections.push(`Usage: ${program.getName()} [options] [command]`);
    sections.push("");
    sections.push(program.getDescription());
    sections.push("");

    // Global options
    const globalOptions: any[] = program.getGlobalOptions();
    if (globalOptions.length > 0) {
      sections.push("Options:");
      const maxFlagLen = Math.max(...globalOptions.map((o: any) => o.flags?.length || 0));
      for (const option of globalOptions) {
        sections.push(`  ${(option.flags || "").padEnd(maxFlagLen + 2)}${option.description || ""}`);
      }
      sections.push("");
    }

    // Commands
    const commands = program.getCommands().filter((c: any) => c.getName() !== "help");
    if (commands.length > 0) {
      sections.push("Commands:");

      // Calculate max usage length
      const maxUsageLen = Math.max(...commands.map((c: any) => {
        const usage = c.getUsage();
        return usage.length;
      }));

      for (const command of commands) {
        const usage = command.getUsage();
        const description = command.getDescription();
        sections.push(`  ${usage.padEnd(maxUsageLen + 2)}${description}`);

        // Add options indented
        const cmdOptions: any[] = command.getOptions ? command.getOptions() : [];
        const cmdArgs: any[] = command.getArguments ? command.getArguments() : [];

        if (cmdOptions.length > 0 || cmdArgs.length > 0) {
          const items: { term: string; desc: string }[] = [];

          for (const opt of cmdOptions) {
            items.push({ term: opt.flags || "", desc: opt.description || "" });
          }

          for (const arg of cmdArgs) {
            const req = arg.required ? " (required)" : " (optional)";
            items.push({ term: `<${arg.name || "arg"}>`, desc: (arg.description || "") + req });
          }

          if (items.length > 0) {
            const maxItemLen = Math.max(...items.map((i) => i.term.length));
            for (const item of items) {
              sections.push(`    ${item.term.padEnd(maxItemLen + 2)}${item.desc}`);
            }
          }
        }
      }
    }

    return sections.join("\n") + "\n";
  });
}

await program.parse();
