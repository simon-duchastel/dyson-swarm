#!/usr/bin/env node

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import { TaskManager } from "dyson-swarm";

import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";
import { updateCommand } from "./commands/update.js";
import { statusCommand } from "./commands/status.js";
import { assignCommand } from "./commands/assign.js";
import { unassignCommand } from "./commands/unassign.js";
import { deleteCommand } from "./commands/delete.js";

// Create main command
const program: any = new Command()
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
  .command("delete", deleteCommand);

// Custom help handler
function buildHelp(cmd: any): string {
  const sections: string[] = [];
  
  sections.push(`Usage: ${cmd.getName()} [options] [command]`);
  sections.push("");
  sections.push(cmd.getDescription());
  sections.push("");
  
  const globalOptions = cmd.getGlobalOptions();
  if (globalOptions.length > 0) {
    sections.push("Options:");
    const rows: string[][] = [];
    for (const opt of globalOptions) {
      const flags = Array.isArray(opt.flags) ? opt.flags.join(", ") : (opt.flags || "");
      rows.push([flags, opt.description || ""]);
    }
    sections.push(Table.from(rows).padding(1).toString());
  }
  
  sections.push("Commands:");
  const cmdRows: string[][] = [];
  
  const addCommands = (command: any, indent = "") => {
    for (const sub of command.getCommands()) {
      const name = sub.getName();
      const args = sub.getArguments()
        .map((arg: any) => arg.optional ? `[${arg.name}]` : `<${arg.name}>`)
        .join(" ");
      
      cmdRows.push([`${indent}${name} ${args}`, sub.getDescription()]);
      
      const opts = sub.getOptions();
      if (opts.length > 0) {
        for (const opt of opts) {
          const optFlags = Array.isArray(opt.flags) ? opt.flags.join(", ") : (opt.flags || "");
          cmdRows.push([`  ${optFlags}`, opt.description || ""]);
        }
      }
    }
  };
  
  addCommands(cmd);
  sections.push(Table.from(cmdRows).padding(1).toString());
  
  return sections.join("\n");
}

program.help((_cmd: any, _options: any) => buildHelp(program));

await program.parse();
