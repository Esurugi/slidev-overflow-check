---
name: slidev-overflow-check-cli
description: Operate and troubleshoot the slidev-overflow-check CLI with the current implementation. Use when users ask to run scans, tune performance options (concurrency/wait/viewport), generate reports (console/json/html), configure checker.config.js, interpret failures, or add tests/docs related to this CLI.
---

# slidev-overflow-check-cli

Use this skill to execute or maintain `slidev-overflow-check` safely and consistently with the repository's current architecture.

## Follow This Workflow

1. Confirm execution target:
- Check URL (`--url`) and optional project path (`--project`).
- Confirm report outputs (`--format`, `--output`) and CI behavior (`--fail-on-issues`).

2. Start from minimal reproducible command:
```bash
slidev-overflow-check --url http://localhost:3030
```

3. Add options incrementally:
- Parallel scan: `--concurrency <n>`
- Stability wait: `--wait <ms>`
- Range filter: `--pages <range>`
- Screenshot evidence: `--screenshot --screenshot-dir <dir>`

4. When editing code, preserve layer boundaries:
- `src/interfaces`: CLI input parsing and command boundary
- `src/application`: orchestration and use cases
- `src/core`: domain logic and detection/analysis
- `src/infrastructure`: Playwright CLI, config, report, markdown I/O

5. Validate with project-standard commands:
```bash
npm test
npm run test:e2e
npm run build
```

## Read These References On Demand

- Command and option patterns: `references/commands.md`
- Typical failure handling and triage: `references/troubleshooting.md`

Load only the file relevant to the current user request.
