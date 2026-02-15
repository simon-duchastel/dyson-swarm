# Schema Version 1

This is the initial schema version for the dyson-swarm task management system.

## Directory Structure

```
.swarm/
└── tasks/
    ├── lockfile
    ├── open/
    │   └── {task-id}/
    │       ├── {task-id}.task
    │       └── sub-tasks/
    │           └── open/
    │               └── {subtask-id}.task
    ├── in-progress/
    │   └── {task-id}/
    │       ├── {task-id}.task
    │       └── sub-tasks/
    │           └── in-progress/
    │               └── {subtask-id}.task
    └── closed/
        └── {task-id}/
            ├── {task-id}.task
            └── sub-tasks/
                └── closed/
                    └── {subtask-id}.task
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

## Status Folders

Tasks are organized into three status folders:
- **open/** - Unassigned tasks waiting to be picked up
- **in-progress/** - Tasks that have been assigned to someone
- **closed/** - Completed tasks

## Subtasks

Each task can have subtasks stored in a `sub-tasks/` directory. Subtasks follow the same file format but are stored directly in the status subdirectories without additional nesting.

## Migration Notes

This is version 1, so there is no migration from a previous version. The migration script for this version is a no-op.
