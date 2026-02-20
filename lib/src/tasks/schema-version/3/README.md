# Schema Version 3

This schema version adds support for task dependencies, allowing tasks to depend on other tasks.

## Directory Structure

```
.swarm/
├── tasks/
│   └── {task-id}/
│       ├── {task-id}.task
│       └── sub-tasks/
│           └── {subtask-id}/
│               └── {subtask-id}.task
└── statuses/
    ├── draft
    ├── open
    ├── in-progress
    └── closed
```

## Task File Format

Tasks are stored as markdown files with YAML frontmatter:

```yaml
---
title: "Task Title"
assignee: "username"  # Optional, only present when assigned
dependsOn:  # Optional, array of task IDs this task depends on
  - "task-id-1"
  - "task-id-2"
---
Task description goes here...
```

## Dependencies

- Tasks can have zero or more dependencies (other task IDs)
- Dependencies are stored as an array in the frontmatter under the `dependsOn` key
- Circular dependencies are prevented at the API level
- Dependencies can be to both main tasks and subtasks
- Dependencies are tracked via the `dependsOn` field in task frontmatter

## Status Files

Status is tracked in separate files within the `statuses/` directory. Each file contains a sorted list of task IDs (one per line) that have that status:

- **draft** - Tasks being drafted
- **open** - Unassigned tasks waiting to be picked up
- **in-progress** - Tasks that have been assigned to someone
- **closed** - Completed tasks

## Subtasks

Each task can have subtasks stored in a `sub-tasks/` directory:
- Subtasks are identified by fully qualified IDs: `{parent-id}/{subtask-id}`
- Subtask files: `tasks/{task-id}/sub-tasks/{subtask-id}/{subtask-id}.task`
- Subtasks follow the same file format as main tasks and can have their own dependencies

## API Additions

The TaskManager class now includes methods for managing dependencies:

- `getTaskDependencies(taskId)` - Get tasks that the given task depends on
- `getDependentTasks(taskId)` - Get tasks that depend on the given task
- `addTaskDependency(taskId, dependencyId)` - Add a dependency to a task
- `removeTaskDependency(taskId, dependencyId)` - Remove a dependency from a task

## Filter Additions

The `listTasks` method now supports filtering by dependency:

```typescript
// List tasks that depend on a specific task
await taskManager.listTasks({ dependsOn: 'task-id' });
```

## Migration Notes

This migration from v2 to v3:
- Adds the `dependsOn` field to task frontmatter (optional, defaults to undefined)
- No structural changes to the directory layout
- Existing tasks without dependencies will continue to work
- The migration is additive only - no data transformation required

See `migrate.ts` for the migration implementation details.
