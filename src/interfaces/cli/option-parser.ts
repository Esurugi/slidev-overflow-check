import { CheckerOptions } from '../../types';

export function parseCliOptions(raw: any, config: Partial<CheckerOptions>): Partial<CheckerOptions> {
  let viewport = config.viewport || { width: 1920, height: 1080 };
  if (raw.viewport) {
    const [width, height] = String(raw.viewport).split('x').map(Number);
    if (isNaN(width) || isNaN(height)) {
      throw new Error('Invalid viewport size format. Use WIDTHxHEIGHT (e.g., 1920x1080)');
    }
    viewport = { width, height };
  }

  const browser = (raw.browser || config.browser || 'auto') as CheckerOptions['browser'];
  if (!['auto', 'chrome', 'msedge', 'firefox', 'webkit'].includes(String(browser))) {
    throw new Error('Invalid browser. Use auto, chrome, msedge, firefox, or webkit');
  }

  const screenshot = (raw.screenshot || config.screenshot)
    ? {
        enabled: true,
        outputDir: raw.screenshotDir || config.screenshot?.outputDir,
        fullPage: raw.screenshotFullPage || config.screenshot?.fullPage,
        highlightIssues: raw.screenshotHighlight !== false && config.screenshot?.highlightIssues !== false,
      }
    : undefined;

  const threshold = parseOptionalNumber(raw.threshold, '--threshold');
  const wait = parseOptionalNumber(raw.wait, '--wait');
  const concurrency = parseOptionalInteger(raw.concurrency, '--concurrency');

  return {
    url: raw.url,
    project: raw.project,
    pages: raw.pages,
    format: raw.format?.split(','),
    output: raw.output,
    threshold,
    wait,
    viewport,
    browser,
    headless: raw.headless,
    verbose: raw.verbose,
    screenshot,
    failOnIssues: raw.failOnIssues,
    concurrency,
  };
}

function parseOptionalNumber(value: unknown, optionName: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${optionName} must be a valid number`);
  }
  return parsed;
}

function parseOptionalInteger(value: unknown, optionName: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be an integer greater than or equal to 1`);
  }
  return parsed;
}
