import { checkInitialization } from "dyson-swarm";

/**
 * Check if dyson-swarm is initialized before running a command
 * Exits with error if not initialized
 */
export async function requireInitialization(): Promise<void> {
  const { isInitialized, missingComponents } = await checkInitialization();

  if (!isInitialized) {
    console.error("Error: This directory is not initialized for dyson-swarm.");
    console.error("Missing: " + missingComponents.join(", "));
    console.error("\nPlease run 'swarm init' to initialize this directory.");
    process.exit(1);
  }
}
