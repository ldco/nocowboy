---
description: Route a task to the appropriate specialized agent (debug, overseer, nocowboy)
---

# /route — Route Task to Specialized Agent

When you're working on something that belongs to another agent, use /route to delegate.

## How It Works

1. The system detects if your current task needs a specialized agent
2. If you type `/route <agent> <description>`, it directly delegates
3. The target agent handles it and returns the result
4. The current agent receives the result and continues

## Manual Routing

```
/route debug Разберись с падением теста: тест X падает с ошибкой Y
```

This sends the task to the `debug` agent and returns the result.

## Agent Capabilities

- **code**: Implementation, refactoring, testing, debugging — default
- **debug**: Systematic diagnosis, root cause analysis, stacktraces
- **overseer**: Code review, orchestration, quality checks (read-only)
- **nocowboy**: Browser automation, shell, filesystem, any MCP tools
