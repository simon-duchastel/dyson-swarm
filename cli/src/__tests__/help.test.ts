import { describe, it, expect } from 'vitest';
import { Command } from '@cliffy/command';
import { generateHelp } from '../help.js';

describe('generateHelp', () => {
  it('should generate help text', () => {
    const cmd = new Command()
      .name('test')
      .description('Test CLI')
      .command('create', new Command()
        .description('Create a task')
        .arguments('<title>')
        .argument('[description]', 'Task description')
      )
      .command('list', new Command()
        .description('List tasks')
        .option('-s, --status <status>', 'Filter by status')
      );

    const helpText = generateHelp(cmd);

    const expected = `Usage: test [options] [command]

Test CLI

Commands:
  create <title> [description] Create a task              
    <title>                    (Required)                 
    [description]              (Optional) Task description
                                                            
  list                         List tasks                 
    -s, --status               Filter by status           `;

    expect(helpText).toBe(expected);
  });

  it('should handle no subcommands', () => {
    const cmd = new Command()
      .name('test')
      .description('Test CLI with no commands')
      .option('-v, --verbose', 'Enable verbose output');

    const helpText = generateHelp(cmd);

    const expected = `Usage: test [options] [command]

Test CLI with no commands`;

    expect(helpText).toBe(expected);
  });
});
