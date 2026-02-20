import { Command } from "@cliffy/command";
import { Input } from "@cliffy/prompt";
import { TaskManager, NotInitializedError } from "dyson-swarm";

export async function dependAction(taskId: string, dependencyId: string, options: any) {
  const taskManager = new TaskManager();

  try {
    if (options.remove) {
      // Remove dependency
      const task = await taskManager.removeTaskDependency(taskId, dependencyId);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Removed dependency: ${taskId} no longer depends on ${dependencyId}`);
    } else {
      // Add dependency
      const task = await taskManager.addTaskDependency(taskId, dependencyId);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      console.log(`Added dependency: ${taskId} now depends on ${dependencyId}`);
    }

    // Show current dependencies
    const dependencies = await taskManager.getTaskDependencies(taskId);
    if (dependencies.length > 0) {
      console.log(`\nCurrent dependencies for ${taskId}:`);
      for (const dep of dependencies) {
        console.log(`  - ${dep.id}: ${dep.frontmatter.title} (${dep.status})`);
      }
    } else {
      console.log(`\n${taskId} has no dependencies.`);
    }
  } catch (error) {
    if (error instanceof NotInitializedError) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    if (error instanceof Error && error.message.includes("Circular dependency")) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.error("Failed to manage dependency:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function depsAction(taskId: string) {
  const taskManager = new TaskManager();

  try {
    const task = await taskManager.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    console.log(`Task: ${taskId} - ${task.frontmatter.title}`);
    console.log(`Status: ${task.status}`);

    // Show dependencies
    const dependencies = await taskManager.getTaskDependencies(taskId);
    if (dependencies.length > 0) {
      console.log(`\nDependencies (${dependencies.length}):`);
      for (const dep of dependencies) {
        console.log(`  - ${dep.id}: ${dep.frontmatter.title} (${dep.status})`);
      }
    } else {
      console.log("\nNo dependencies.");
    }

    // Show dependent tasks
    const dependents = await taskManager.getDependentTasks(taskId);
    if (dependents.length > 0) {
      console.log(`\nDepended on by (${dependents.length}):`);
      for (const dep of dependents) {
        console.log(`  - ${dep.id}: ${dep.frontmatter.title} (${dep.status})`);
      }
    } else {
      console.log("\nNo tasks depend on this.");
    }
  } catch (error) {
    if (error instanceof NotInitializedError) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.error("Failed to get dependencies:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const dependCommand: any = new Command()
  .name("depend")
  .description("Add or remove a task dependency.")
  .argument("<taskId>", "The id of the task.")
  .argument("<dependencyId>", "The id of the task to depend on.")
  .option("-r, --remove", "Remove the dependency instead of adding it.")
  .action(async (options: any, taskId: string, dependencyId: string) => dependAction(taskId, dependencyId, options));

export const depsCommand: any = new Command()
  .name("deps")
  .description("Show task dependencies.")
  .argument("<taskId>", "The id of the task.")
  .action(async (_options: any, taskId: string) => depsAction(taskId));
