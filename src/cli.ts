#!/usr/bin/env node

import { runCli } from './interfaces/cli/command';

runCli().catch(error => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
