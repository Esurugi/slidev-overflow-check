import { Command } from 'commander';
import { runOverflowCheck } from '../../application/usecases/run-overflow-check';
import { ConfigLoader } from '../../infrastructure/config/config-loader';
import { CheckerOptions } from '../../types';
import { parseCliOptions } from './option-parser';
import { getExitCode } from './exit-policy';

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('slidev-overflow-check')
    .description('Automatically detect content overflow in Slidev presentations')
    .version('0.1.0');

  program
    .option('-u, --url <url>', 'URL of the Slidev presentation (required)')
    .option('--project <path>', 'Path to Slidev project directory (for source mapping)')
    .option('-p, --pages <range>', 'Page range to check (e.g., 1-10, 5)')
    .option('-f, --format <formats>', 'Output formats (console,html,json)', 'console')
    .option('-o, --output <dir>', 'Output directory', './reports')
    .option('-t, --threshold <n>', 'Overflow detection threshold in pixels', '1')
    .option('-w, --wait <ms>', 'Additional wait time after rendering stabilizes in milliseconds', '0')
    .option('--viewport <size>', 'Viewport size (e.g., 1920x1080)', '1920x1080')
    .option('-b, --browser <name>', 'Browser to use (auto/chrome/msedge/firefox/webkit)', 'auto')
    .option('--headless', 'Run in headless mode', true)
    .option('--no-headless', 'Run in non-headless mode')
    .option('-v, --verbose', 'Show detailed logs', false)
    .option('--screenshot', 'Enable screenshot capture for slides with issues', false)
    .option('--screenshot-dir <dir>', 'Screenshot output directory', './screenshots')
    .option('--screenshot-full-page', 'Capture full page screenshots', false)
    .option('--no-screenshot-highlight', 'Disable highlighting of issues in screenshots')
    .option('--fail-on-issues', 'Exit with code 1 if issues are found (for CI/CD)', false)
    .option('--concurrency <n>', 'Number of slides to check in parallel', '1')
    .option('-c, --config <path>', 'Path to configuration file');

  program.action(async rawOptions => {
    const configLoader = new ConfigLoader();
    let config: Partial<CheckerOptions> = {};

    if (rawOptions.config) {
      config = await configLoader.loadConfig(rawOptions.config);
    }

    if (!rawOptions.url && !config.url) {
      throw new Error('--url option is required');
    }

    const cliOptions = parseCliOptions(rawOptions, config);
    const checkerOptions = configLoader.mergeWithCliOptions(config, cliOptions) as CheckerOptions;
    const result = await runOverflowCheck(checkerOptions);

    process.exitCode = getExitCode(result, checkerOptions);
  });

  await program.parseAsync(argv);
}
