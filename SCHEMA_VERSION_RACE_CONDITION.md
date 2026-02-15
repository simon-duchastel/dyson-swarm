# Schema Version Migration Race Condition Issue

## Issue Description

The current schema version migration system has a potential race condition when multiple processes are working with the same `.swarm` directory:

### Scenario
1. Process A (old version) starts editing tasks
2. Process B (new version) migrates tasks to the new schema version and updates the version file
3. Process A tries to continue editing tasks with the old schema assumptions

### Result
The system can get into an inconsistent state where Process A is working with outdated schema assumptions while the tasks have already been migrated to a newer version.

### Current Behavior
- Schema version is checked and migrations are run when TaskManager acquires the lock
- No mechanism to detect if another process has migrated the schema mid-operation
- Old processes continue operating assuming the old schema

### Desired Behavior
Need to figure out a robust solution to handle this scenario. Possible approaches to consider:
- Check schema version before each operation (not just at lock acquisition)
- Implement a heartbeat/version check mechanism
- Abort operations if schema version changes mid-flight
- Some other approach?

### Priority
Low - This is an edge case that requires multiple processes with different versions running simultaneously, which is unlikely in normal usage. For now, the current implementation is good enough for most use cases.

## Acceptance Criteria
- [ ] Design a solution for handling concurrent schema migrations
- [ ] Implement the chosen solution
- [ ] Add tests for the concurrent migration scenario
