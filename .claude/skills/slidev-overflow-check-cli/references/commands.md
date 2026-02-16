# Command Patterns

## Minimal

```bash
slidev-overflow-check --url http://localhost:3030
```

## CI Fail On Detection

```bash
slidev-overflow-check --url http://localhost:3030 --fail-on-issues
```

## Multi-format Reports + Screenshots

```bash
slidev-overflow-check \
  --url http://localhost:3030 \
  --format console,json,html \
  --output ./reports \
  --screenshot \
  --screenshot-dir ./screenshots
```

## Config-driven

```bash
slidev-overflow-check --config ./checker.config.js
```

## Key Option Notes

- `--url` is required.
- `--threshold` must be `>= 0`.
- `--wait` must be `>= 0`.
- `--concurrency` must be integer `>= 1`.
- `--viewport` format must be `WIDTHxHEIGHT`.
