# Schema Version 2

This schema version reorganizes the task management system to use a flat task structure with separate status files.

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
---
Task description goes here...
```

## Status Files

Status is now tracked in separate files within the `statuses/` directory. Each file contains a sorted list of task IDs (one per line) that have that status:

- **draft** - Tasks being drafted (new status in v2)
- **open** - Unassigned tasks waiting to be picked up
- **in-progress** - Tasks that have been assigned to someone
- **closed** - Completed tasks

## Task Storage

Tasks are stored in a flat structure where each task has its own directory:
- Task files: `tasks/{task-id}/{task-id}.task`
- This removes the need to move files between status folders when status changes

## Subtasks

Each task can have subtasks stored in a `sub-tasks/` directory:
- Subtasks are identified by fully qualified IDs: `{parent-id}/{subtask-id}`
- Subtask files: `tasks/{task-id}/sub-tasks/{subtask-id}/{subtask-id}.task`
- Subtasks follow the same file format as main tasks

## Migration Notes

This migration from v1 to v2:
- Moves tasks from status-based folders to a flat task structure
- Creates separate status files containing sorted task ID lists
- Adds a new 'draft' status
- Updates subtask IDs to be fully qualified with parent prefix
- Subtasks are now stored in their own directories like main tasks

See `migrate.ts` for the migration implementation details.
