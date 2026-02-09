# Dyson Swarm

A markdown-based issue tracking system that provides a simple, human-readable way to manage tasks and issues.

## Overview

Dyson Swarm stores issues as markdown files with YAML frontmatter, making them human readable and git-trackable.

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

## CLI Tool

(Coming soon)

## License

MIT
