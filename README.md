# Dyson Swarm

A markdown-based issue tracking system that provides a simple, human-readable way to manage tasks and issues directly in your Git repository.

## Overview

Dyson Swarm stores issues as markdown files with YAML frontmatter, making them:
- **Human-readable** - Every issue is a plain markdown file you can read and edit
- **Git-trackable** - All changes are tracked in your repository history
- **CLI-friendly** - Designed to be used both programmatically and via command-line tools
- **No external dependencies** - Works entirely with local files

## Quick Start

### Installation

```bash
npm install dyson-swarm
```

### Basic Usage

```javascript
import { TaskManager } from 'dyson-swarm';

const taskManager = new TaskManager();

// Create a new task
const task = await taskManager.createTask({
  title: 'Fix login bug',
  description: 'Users cannot log in with correct credentials',
  assignee: 'john.doe'
});

// List all open tasks
const openTasks = await taskManager.listTasks({ status: 'open' });

// Get a specific task
const retrieved = await taskManager.getTask(task.id);
```

## Storage Structure

Tasks are organized by status in the `.dyson/tasks/` directory:

```
.dyson/tasks/
├── open/
│   └── {taskId}/
│       └── {taskId}.task
├── in-progress/
│   └── {taskId}/
│       ├── {taskId}.task
│       └── sub-tasks/
│           ├── open/
│           ├── in-progress/
│           └── closed/
└── closed/
    └── {taskId}/
        └── {taskId}.task
```

Each task file contains YAML frontmatter with metadata and a markdown description:

```yaml
---
title: "Fix login bug"
assignee: "john.doe"
---
Users cannot log in with correct credentials. The login form appears to validate correctly but the authentication endpoint returns a 500 error.
```

## TaskManager API

### Creating Tasks

```javascript
// Simple task
const task = await taskManager.createTask({
  title: 'New feature request',
  description: 'Add dark mode support to the application'
});

// Assigned task (automatically moves to in-progress)
const assignedTask = await taskManager.createTask({
  title: 'Critical bug',
  description: 'Fix memory leak in data processing',
  assignee: 'jane.doe'
});

// Task with subtasks
const complexTask = await taskManager.createTask({
  title: 'Implement user authentication',
  description: 'Add complete authentication system',
  subtasks: [
    {
      title: 'Create login UI',
      description: 'Design and implement login form'
    },
    {
      title: 'Implement JWT tokens',
      description: 'Add token-based authentication'
    }
  ]
});
```

### Managing Tasks

```javascript
// Get a task
const task = await taskManager.getTask('task-id-here');

// List tasks with filters
const allTasks = await taskManager.listTasks();
const openTasks = await taskManager.listTasks({ status: 'open' });
const assignedTasks = await taskManager.listTasks({ assignee: 'john.doe' });
const tasksWithSubtasks = await taskManager.listTasks({ hasSubtasks: true });

// Update a task
const updated = await taskManager.updateTask(task.id, {
  title: 'Updated title',
  description: 'Updated description',
  assignee: 'new.assignee'
});

// Change status
const closed = await taskManager.changeTaskStatus(task.id, 'closed');

// Assign/unassign
const assigned = await taskManager.assignTask(task.id, 'john.doe');
const unassigned = await taskManager.unassignTask(task.id);

// Delete a task
const deleted = await taskManager.deleteTask(task.id);
```

### Task Status Flow

Tasks flow through three statuses:

1. **`open`** - New tasks, not yet assigned
2. **`in-progress`** - Tasks with an assignee actively working on them
3. **`closed`** - Completed or resolved tasks

Status changes happen automatically:
- Assigning a task moves it from `open` → `in-progress`
- Unassigning a task moves it from `in-progress` → `open`
- Manual status changes are also available

## Advanced Usage

### Custom Working Directory

```javascript
const customTaskManager = new TaskManager({
  cwdProvider: () => '/path/to/project'
});
```

### Direct File Access

```javascript
import { TaskFileUtils } from 'dyson-swarm';

// Parse a task file manually
const { frontmatter, description } = TaskFileUtils.parseTaskFile('.dyson/tasks/open/task-id/task-id.task');

// Generate task ID
const taskId = TaskFileUtils.generateTaskId();
```

### Path Utilities

```javascript
import { getTasksDir, getTaskFile } from 'dyson-swarm';

const tasksDir = getTasksDir(); // '.dyson/tasks'
const taskFile = getTaskFile('task-id', 'open'); // '.dyson/tasks/open/task-id/task-id.task'
```

## CLI Tool (Coming Soon)

A command-line interface is planned that will provide commands like:

```bash
dyson create "Fix login bug" "Users cannot log in"
dyson list --status open
dyson assign task-id john.doe
dyson close task-id
```

## Design Goals

1. **Markdown-based** - All issues stored as human-readable markdown files
2. **Library-first** - Primary interaction through the JavaScript API
3. **CLI-compatible** - Designed to support command-line tools
4. **Git-native** - Leverages Git for change tracking and collaboration
5. **No database** - File-based storage that works anywhere

## Why Use This Over GitHub/GitLab Issues?

- **Offline-friendly** - Works without internet connection
- **Privacy-focused** - Your issues stay in your repository
- **Customizable** - Extend and modify as needed
- **Integrated** - Issues live alongside your code
- **Portable** - Move repos between platforms without losing issues

## License

MIT