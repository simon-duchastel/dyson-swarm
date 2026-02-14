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

await new Command()
  .help(function() {
    const lines: string[] = [];
    
    lines.push(`Usage: ${this.getName()} [options] [command]`);
    lines.push("");
    lines.push(this.getDescription());
    lines.push("");
    
    lines.push("Commands:");
    const cmdRows: string[][] = [];
    
    const allCommands = this.getCommands();
    for (const cmd of allCommands) {
      const name = cmd.getName();
      const args = cmd.getArguments()
        .map((arg: any) => arg.optional ? `[${arg.name}]` : `<${arg.name}>`)
        .join(" ");
      
      cmdRows.push([`  ${name} ${args}`.padEnd(28), cmd.getDescription()]);
      
      // Add arguments
      const arguments_ = cmd.getArguments();
      for (const arg of arguments_) {
        const argStr = (arg as any).optional ? `[${arg.name}]` : `<${arg.name}>`;
        const description = (arg as any).description ? ` ${arg.description}` : "";
        const requiredText = (arg as any).optional ? "(Optional)" : "(Required)";
        cmdRows.push([`    ${argStr}`.padEnd(28), requiredText + (description || "")]);
      }


      // Add options
      const opts = cmd.getOptions();
      for (const opt of opts) {
        const flags = Array.isArray(opt.flags) ? opt.flags.join(", ") : (opt.flags || "");
        const desc = opt.description || "";
        cmdRows.push([`    ${flags}`.padEnd(28), desc]);
      }
      
      // Add empty row for spacing
      cmdRows.push(["", ""]);
    }
    
    // Remove last empty row
    cmdRows.pop();
    
    lines.push(Table.from(cmdRows).padding(1).toString());
    
    return lines.join("\n");
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
