#!/usr/bin/env node

import { Command } from "@cliffy/command";

import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";
import { updateCommand } from "./commands/update.js";
import { statusCommand } from "./commands/status.js";
import { assignCommand } from "./commands/assign.js";
import { unassignCommand } from "./commands/unassign.js";
import { deleteCommand } from "./commands/delete.js";
import { generateHelp } from "./help.js";

await new Command()
  .help(function() {
    return generateHelp(this);
  })
  .name("swarm")
  .action(function () {
    this.showHelp();
  })
  .description("A markdown-based issue tracking system CLI")
  .version("1.0.0")
  .command("create", createCommand)
  .command("list", listCommand)
  .command("get", getCommand)
  .command("update", updateCommand)
  .command("status", statusCommand)
  .command("assign", assignCommand)
  .command("unassign", unassignCommand)
  .command("delete", deleteCommand)
  .parse();
