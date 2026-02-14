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

function buildHelp(cmd: any): string {
  const sections: string[] = [];
  
  sections.push("Commands:");
  const cmdRows: string[][] = [];
  
  const addCommands = (command: any, indent = "") => {
    for (const sub of [createCommand, listCommand, getCommand, updateCommand, statusCommand, assignCommand, unassignCommand, deleteCommand]) {
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

await new Command()
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
  .help(() => {
    let helpText = "test"; //cmd.getHelp();
    helpText += "\n\nSUBCOMMAND OPTIONS:\n";
    return buildHelp("foo");
  })
  .parse();
