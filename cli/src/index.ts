#!/usr/bin/env node

import { Command } from 'commander';
import { TaskManager } from 'dyson-swarm';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { getCommand } from './commands/get.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';
import { assignCommand } from './commands/assign.js';
import { unassignCommand } from './commands/unassign.js';
import { deleteCommand } from './commands/delete.js';

const program = new Command();

program
  .name('swarm')
  .description('A markdown-based issue tracking system CLI')
  .version('1.0.0');

program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(getCommand);
program.addCommand(updateCommand);
program.addCommand(statusCommand);
program.addCommand(assignCommand);
program.addCommand(unassignCommand);
program.addCommand(deleteCommand);

program.parse();
