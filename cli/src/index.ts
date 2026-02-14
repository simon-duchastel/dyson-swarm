#!/usr/bin/env node

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";

import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";
import { updateCommand } from "./commands/update.js";
import { statusCommand } from "./commands/status.js";
import { assignCommand } from "./commands/assign.js";
import { unassignCommand } from "./commands/unassign.js";
import { deleteCommand } from "./commands/delete.js";

const allCommands = [createCommand, listCommand, getCommand, updateCommand, statusCommand, assignCommand, unassignCommand, deleteCommand];

await new Command()
  .help(function() {
    const lines: string[] = [];
    
    lines.push(`Usage: ${this.getName()} [options] [command]`);
    lines.push("");
    lines.push(this.getDescription());
    lines.push("");
    
    lines.push("Commands:");
    const cmdRows: string[][] = [];
    
    for (const cmd of allCommands) {
      const name = cmd.getName();
      const args = cmd.getArguments()
        .map((arg: any) => arg.optional ? `[${arg.name}]` : `<${arg.name}>`)
        .join(" ");
      
      cmdRows.push([`${name} ${args}`, cmd.getDescription()]);
      
      const opts = cmd.getOptions();
      for (const opt of opts) {
        const flags = Array.isArray(opt.flags) ? opt.flags.join(", ") : (opt.flags || "");
        cmdRows.push([`  ${flags}`, opt.description || ""]);
      }
    }
    
    lines.push(Table.from(cmdRows).padding(1).toString());
    
    return lines.join("\n");
  })
  .name("swarm")
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
