#!/usr/bin/env node

import { Command } from "@cliffy/command";
import { flatHelp } from "cliffy-flat-help";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";
import { updateCommand } from "./commands/update.js";
import { statusCommand } from "./commands/status.js";
import { assignCommand } from "./commands/assign.js";
import { unassignCommand } from "./commands/unassign.js";
import { deleteCommand } from "./commands/delete.js";
import { initCommand } from "./commands/init.js";
import { dependCommand, depsCommand } from "./commands/depend.js";

await new Command()
  .help(flatHelp())
  .name("swarm")
  .description("A markdown-based issue tracking system CLI")
  .version(version)
  .action(function () {
    this.showHelp();
  })
  .command("init", initCommand)
  .command("create", createCommand)
  .command("list", listCommand)
  .command("get", getCommand)
  .command("update", updateCommand)
  .command("status", statusCommand)
  .command("assign", assignCommand)
  .command("unassign", unassignCommand)
  .command("delete", deleteCommand)
  .command("depend", dependCommand)
  .command("deps", depsCommand)
  .parse();
