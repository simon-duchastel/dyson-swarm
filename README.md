# Dyson Swarm

A markdown-based issue tracking system that provides a simple, human-readable way to manage tasks and issues.

## Installation

```bash
npm install dyson-swarm
```

## Quick Start

```javascript
import { TaskManager } from 'dyson-swarm';

const tm = new TaskManager();

// Create a task
const task = await tm.createTask({
  title: 'Fix login bug',
  description: 'Users cannot log in with correct credentials'
});

// List all open tasks
const open = await tm.listTasks({ status: 'open' });

// Update and change status
await tm.updateTask(task.id, { assignee: 'john' });
await tm.changeTaskStatus(task.id, 'closed');
```

## CLI

After installation, use the `swarm` command:

```bash
# Create a task
swarm create -t "Fix bug" -d "Login not working"

# List tasks (filter by status, assignee, subtasks)
swarm list --status open
swarm list --assignee john
swarm list --has-subtasks

# Get a specific task
swarm get <taskId>

# Update a task
swarm update <taskId> -t "New title" -d "New description" -a "john"

# Change status
swarm status <taskId> closed

# Assign/unassign
swarm assign <taskId> john
swarm unassign <taskId>

# Delete a task
swarm delete <taskId>
```

### CLI Options

| Command | Description |
|---------|-------------|
| `create` | Create a new task |
| `list` | List tasks with optional filters |
| `get <taskId>` | Get a specific task |
| `update <taskId>` | Update a task |
| `status <taskId> <status>` | Change task status |
| `assign <taskId> <assignee>` | Assign a task |
| `unassign <taskId>` | Unassign a task |
| `delete <taskId>` | Delete a task |

**Filter flags:** `-s, --status`, `-a, --assignee`, `--has-subtasks`, `--no-subtasks`

## API

### TaskManager

The main class for managing tasks.

```javascript
import { TaskManager } from 'dyson-swarm';

const tm = new TaskManager();
```

#### createTask(options)

Create a new task. Returns the created task.

```javascript
// Simple task (starts as 'open')
const task = await tm.createTask({
  title: 'New feature',
  description: 'Add dark mode'
});

// Task with assignee (starts as 'in-progress')
const assigned = await tm.createTask({
  title: 'Bug fix',
  description: 'Fix memory leak',
  assignee: 'john'
});

// Task with subtasks
const withSubtasks = await tm.createTask({
  title: 'User auth',
  description: 'Add authentication',
  subtasks: [
    { title: 'Login UI', description: 'Design login form' },
    { title: 'JWT tokens', description: 'Add token auth' }
  ]
});
```

#### getTask(taskId)

Get a task by ID. Returns the task or null if not found.

```javascript
const task = await tm.getTask('abc-123');
console.log(task.title, task.status, task.subtasks);
```

#### listTasks(filter)

List tasks with optional filters. Returns an array.

```javascript
// All tasks
const all = await tm.listTasks();

// Filter by status
const open = await tm.listTasks({ status: 'open' });
const inProgress = await tm.listTasks({ status: 'in-progress' });
const closed = await tm.listTasks({ status: 'closed' });

// Filter by assignee
const mine = await tm.listTasks({ assignee: 'john' });

// Filter by subtasks
const withSubtasks = await tm.listTasks({ hasSubtasks: true });
const withoutSubtasks = await tm.listTasks({ hasSubtasks: false });
```

#### updateTask(taskId, options)

Update a task's fields. Returns the updated task.

```javascript
await tm.updateTask('abc-123', {
  title: 'New title',
  description: 'New description',
  assignee: 'john'
});
```

Assigning a task moves it from `open` to `in-progress`. Unassigning moves it back to `open`.

#### changeTaskStatus(taskId, status)

Change a task's status directly.

```javascript
await tm.changeTaskStatus('abc-123', 'in-progress');
await tm.changeTaskStatus('abc-123', 'closed');
```

Valid statuses: `open`, `in-progress`, `closed`

#### assignTask(taskId, assignee)

Assign a task to a user. Shorthand for `updateTask(taskId, { assignee })`.

```javascript
await tm.assignTask('abc-123', 'john');
```

#### unassignTask(taskId)

Remove assignment from a task. Shorthand for `updateTask(taskId, { assignee: undefined })`.

```javascript
await tm.unassignTask('abc-123');
```

#### deleteTask(taskId)

Delete a task. Returns true if deleted.

```javascript
await tm.deleteTask('abc-123');
```

### Task Object

```typescript
{
  id: string;
  frontmatter: { title: string; assignee?: string };
  description: string;
  status: 'open' | 'in-progress' | 'closed';
  subtasks?: Task[];
}
```

## Storage

Tasks are stored as markdown files with YAML frontmatter in `.swarm/tasks/`:

```
.swarm/tasks/
├── open/{id}/{id}.task
├── in-progress/{id}/{id}.task
│   └── sub-tasks/{status}/
└── closed/{id}/{id}.task
```

Task file format:

```yaml
---
title: "Fix login bug"
assignee: "john.doe"
---
Users cannot log in with correct credentials.
```
