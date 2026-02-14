#!/usr/bin/env node

import { Command, Option } from 'commander';
import { TaskManager } from 'dyson-swarm';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { getCommand } from './commands/get.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';
import { assignCommand } from './commands/assign.js';
import { unassignCommand } from './commands/unassign.js';
import { deleteCommand } from './commands/delete.js';

// Check for --help-simple before creating the program
const args = process.argv;
const showSimpleHelp = args.includes('--help-simple') || args.includes('-hs');

const program = new Command();

program
  .name('swarm')
  .description('A markdown-based issue tracking system CLI')
  .version('1.0.0');

// Add help-simple option (no short flag since -h is taken by --help)
program.option('--help-simple', 'Show simple command list only');

program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(getCommand);
program.addCommand(updateCommand);
program.addCommand(statusCommand);
program.addCommand(assignCommand);
program.addCommand(unassignCommand);
program.addCommand(deleteCommand);

// Custom help output
if (!showSimpleHelp) {
  program.configureHelp({
    sortSubcommands: true,
    formatHelp: (cmd, helper) => {
      const sections: string[] = [];
      
      // Header
      sections.push(`Usage: ${cmd.name()} [options] [command]`);
      sections.push('');
      sections.push(cmd.description());
      sections.push('');
      
      // Options
      const globalOptions = program.options;
      if (globalOptions.length > 0) {
        sections.push('Options:');
        const maxFlagLen = Math.max(...globalOptions.map((o: any) => o.flags.length));
        for (const option of globalOptions) {
          sections.push(`  ${option.flags.padEnd(maxFlagLen + 2)}${option.description}`);
        }
        sections.push('');
      }
      
      // Commands
      const commands = [...cmd.commands].sort((a: Command, b: Command) => a.name().localeCompare(b.name()));
      const nonHelpCommands = commands.filter((c: Command) => c.name() !== 'help');
      
      if (nonHelpCommands.length > 0) {
        sections.push('Commands:');
        
        // Calculate max usage length
        const maxUsageLen = Math.max(...nonHelpCommands.map((c: Command) => {
          const parts = [c.name()];
          if (c.options.length > 0) parts.push('[options]');
          c.registeredArguments.forEach((arg: any) => {
            parts.push(arg.required ? `<${arg.name()}>` : `[${arg.name()}]`);
          });
          return parts.join(' ').length;
        }));
        
        for (const command of nonHelpCommands) {
          const parts = [command.name()];
          if (command.options.length > 0) parts.push('[options]');
          command.registeredArguments.forEach((arg: any) => {
            parts.push(arg.required ? `<${arg.name()}>` : `[${arg.name()}]`);
          });
          
          const usage = parts.join(' ');
          sections.push(`  ${usage.padEnd(maxUsageLen + 2)}${command.description()}`);
          
          // Add options and args indented
          const items: { term: string; desc: string }[] = [];
          
          if (command.options.length > 0) {
            for (const opt of command.options) {
              items.push({ term: opt.flags, desc: opt.description });
            }
          }
          
          if (command.registeredArguments.length > 0) {
            for (const arg of command.registeredArguments) {
              items.push({ 
                term: `<${arg.name()}>`, 
                desc: arg.description + (arg.required ? ' (required)' : ' (optional)') 
              });
            }
          }
          
          if (items.length > 0) {
            const maxItemLen = Math.max(...items.map(i => i.term.length));
            for (const item of items) {
              sections.push(`    ${item.term.padEnd(maxItemLen + 2)}${item.desc}`);
            }
          }
        }
      }
      
      return sections.join('\n') + '\n';
    }
  });
}

program.parse();
