import { AnalysisOrchestrator } from '../services/analysis-orchestrator';
import { ScanOrchestrator } from '../services/scan-orchestrator';
import { resolveBrowser } from '../../infrastructure/playwright-cli/browser-session';
import { CheckResult, CheckerOptions } from '../../types';

export async function runOverflowCheck(options: CheckerOptions): Promise<CheckResult> {
  const normalized: CheckerOptions = {
    threshold: 1,
    wait: 0,
    viewport: { width: 1920, height: 1080 },
    browser: 'auto',
    headless: true,
    verbose: false,
    exclude: ['.slidev-page-indicator', '.slidev-nav'],
    concurrency: 1,
    ...options,
  };

  if (!normalized.url) {
    throw new Error('URL is required. Please start Slidev manually and provide the URL with --url option.');
  }
  validateNumericOptions(normalized);

  const browser = await resolveBrowser(normalized);
  const scanOrchestrator = new ScanOrchestrator();
  const result = await scanOrchestrator.run({
    options: normalized,
    browser,
  });

  const analysisOrchestrator = new AnalysisOrchestrator();
  try {
    const analysis = await analysisOrchestrator.analyze(normalized, result);
    if (analysis) {
      result.analysis = analysis;
    }
  } catch (error) {
    console.warn(
      'Warning: Content analysis failed. Continuing with overflow scan result.',
      error instanceof Error ? error.message : error
    );
  }

  return result;
}

function validateNumericOptions(options: CheckerOptions): void {
  if (options.threshold !== undefined && (!Number.isFinite(options.threshold) || options.threshold < 0)) {
    throw new Error('--threshold must be a non-negative number');
  }

  if (options.wait !== undefined && (!Number.isFinite(options.wait) || options.wait < 0)) {
    throw new Error('--wait must be a non-negative number');
  }

  if (
    options.concurrency !== undefined &&
    (!Number.isInteger(options.concurrency) || options.concurrency < 1)
  ) {
    throw new Error('--concurrency must be an integer greater than or equal to 1');
  }
}
