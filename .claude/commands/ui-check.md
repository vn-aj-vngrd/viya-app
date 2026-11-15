---
description: Audit the current UI changes against DESIGN.md
---
Run the `ui-reviewer` subagent on the current diff of `apps/native`. Then run `npx tsc --noEmit` in `apps/native` and `npx ultracite check` on the changed files. Report findings ranked by severity, then the type and lint results. $ARGUMENTS
