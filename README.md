# Dyson Swarm

A markdown-based issue tracking system that provides a simple, human-readable way to manage tasks and issues.

## Installation

```bash
npm install dyson-swarm
npm install -g dyson-swarm-cli # optionally install the CLI
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

After installation, use the `swarm` command (if `dyson-swarm-cli` was installed):

```bash
# Initialize dyson-swarm in the current directory
swarm init

# Create a task
swarm create -t "Fix bug" -d "Login not working"

# Create a subtask
swarm create -t "Subtask" -d "Part of parent" --parent <parentTaskId>

# Create a task with dependencies
swarm create -t "Implement feature" -d "New feature implementation" --depends-on <task-id-1>,<task-id-2>

# Add a dependency to an existing task
swarm depend <taskId> <dependencyId>

# Remove a dependency from a task
swarm depend <taskId> <dependencyId> --remove

# Show task dependencies
swarm deps <taskId>

# List tasks that depend on a specific task
swarm list --depends-on <taskId>

# List tasks (filter by status, assignee)
swarm list --status open
swarm list --assignee john

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
| `init` | Initialize dyson-swarm in the current directory |
| `create` | Create a new task |
| `list` | List tasks with optional filters |
| `get <taskId>` | Get a specific task |
| `update <taskId>` | Update a task |
| `status <taskId> <status>` | Change task status |
| `assign <taskId> <assignee>` | Assign a task |
| `unassign <taskId>` | Unassign a task |
| `delete <taskId>` | Delete a task |
| `depend <taskId> <dependencyId>` | Add/remove a task dependency |
| `deps <taskId>` | Show task dependencies |

Run `swarm --help` for comprehensive help dialog

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

// Subtask
const subtask = await tm.createTask({
  title: 'Login UI',
  description: 'Design login form',
  parentTaskId: 'parent-task-id'
});

// Task with dependencies
const taskWithDeps = await tm.createTask({
  title: 'Implement feature',
  description: 'Implement the new feature',
  dependsOn: ['task-id-1', 'task-id-2']
});
```

#### getTask(taskId)

Get a task by ID. Returns the task or null if not found.

```javascript
const task = await tm.getTask('abc-123');
console.log(task.title, task.status);
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


```

#### listTaskStream(options)

Stream tasks as they are found, useful for large task lists.

```javascript
for await (const task of tm.listTaskStream()) {
  console.log(task.title);
}
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

Valid statuses: `open`, `in-progress`, `closed`, `draft`

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

#### getTaskDependencies(taskId)

Get tasks that this task depends on. Returns an array of tasks.

```javascript
const deps = await tm.getTaskDependencies('abc-123');
for (const dep of deps) {
  console.log(`${dep.id}: ${dep.frontmatter.title} (${dep.status})`);
}
```

#### getDependentTasks(taskId)

Get tasks that depend on this task. Returns an array of tasks.

```javascript
const dependents = await tm.getDependentTasks('abc-123');
for (const dep of dependents) {
  console.log(`${dep.id}: ${dep.frontmatter.title} (${dep.status})`);
}
```

#### addTaskDependency(taskId, dependencyId)

Add a dependency to a task. Returns the updated task. Throws error if it would create a circular dependency.

```javascript
await tm.addTaskDependency('abc-123', 'def-456');
```

#### removeTaskDependency(taskId, dependencyId)

Remove a dependency from a task. Returns the updated task.

```javascript
await tm.removeTaskDependency('abc-123', 'def-456');
```

### Task Dependencies

Tasks can depend on other tasks. This is useful for modeling work that cannot start until other work is completed.

- Tasks can have zero or more dependencies
- Dependencies are stored as an array of task IDs in the frontmatter
- Circular dependencies are automatically disallowed, ex. A->B, B->C, C->A is invalid.
- Both main tasks and subtasks can have dependencies

```javascript
// Create task with dependencies
const task = await tm.createTask({
  title: 'Deploy to production',
  description: 'Deploy the application',
  dependsOn: ['test-task-id', 'build-task-id']
});

// Add dependency later
await tm.addTaskDependency(task.id, 'review-task-id');

// Check if dependencies are complete
const deps = await tm.getTaskDependencies(task.id);
const allComplete = deps.every(d => d.status === 'closed');
```

### Task Object

```typescript
{
  id: string;
  frontmatter: { 
    title: string; 
    assignee?: string;
    dependsOn?: string[];  // Array of task IDs this task depends on
  };
  description: string;
  status: 'open' | 'in-progress' | 'closed' | 'draft';
}
```

## Storage

Tasks are stored as markdown files with YAML frontmatter in `.swarm/tasks/`:

```
.swarm/
├── statuses/            # Tracks current status of each task
│   ├── draft
│   ├── open
│   ├── in-progress
│   └── closed
└── tasks/
    └── {id}/
        └── {id}.task    # Task content
```


