# Troubleshooting

## `playwright-cli` Not Found

- Ensure `playwright-cli` is installed and available in PATH.
- Re-run command after confirming terminal can execute `playwright-cli --help`.

## Slidev Not Reachable

- Confirm Slidev dev server is running.
- Verify `--url` host/port and access via browser.

## No Issues But Expected Overflow

- Lower `--threshold` (for example `--threshold 0`).
- Increase `--wait` if transitions/animations settle late.
- Check target page range with `--pages`.

## Slow Scan

- Increase `--concurrency` gradually while monitoring host load.
- Limit scope with `--pages`.
- Disable screenshot unless needed for evidence.

## Contributor Validation Baseline

```bash
npm test
npm run test:e2e
npm run build
```
