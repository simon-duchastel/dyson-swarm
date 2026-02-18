import { Command } from "@cliffy/command";
import { initialize, checkInitialization } from "dyson-swarm";

export async function initAction() {
  const { isInitialized, missingComponents } = await checkInitialization();

  if (isInitialized) {
    console.warn("Warning: This directory is already initialized for dyson-swarm.");
    console.warn("If you want to reinitialize, remove the .swarm directory first.");
    process.exit(1);
  }

  try {
    await initialize();
    console.log("✓ Initialized dyson-swarm in the current directory");
    console.log("  Created .swarm/ directory with:");
    console.log("  - version file (schema version 2)");
    console.log("  - tasks/ directory");
    console.log("  - statuses/ directory with status files (draft, open, in-progress, closed)");
    console.log("  - lockfile for concurrent access");
    console.log("\nYou can now create and manage tasks with commands like:");
    console.log("  swarm create -t \"My task\" -d \"Task description\"");
  } catch (error) {
    console.error("Failed to initialize:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const initCommand: any = new Command()
  .description("Initialize dyson-swarm in the current directory.")
  .action(initAction);
