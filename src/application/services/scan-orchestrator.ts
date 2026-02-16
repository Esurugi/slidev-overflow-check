import { join } from 'path';
import { Detector } from '../../core/detection/detector';
import { CheckResult, CheckerOptions, DetectionConfig, SlideResult } from '../../types';
import { createOpenedClient, CliBrowser } from '../../infrastructure/playwright-cli/browser-session';
import { PageNavigator } from '../../infrastructure/playwright-cli/page-navigator';
import { SlideMapper } from '../../infrastructure/markdown/slide-mapper';
import { ConsoleReporter } from '../../infrastructure/reporting/console-reporter';
import { HtmlReporter } from '../../infrastructure/reporting/html-reporter';
import { JsonReporter } from '../../infrastructure/reporting/json-reporter';
import { ScreenshotCapture } from '../../infrastructure/capture/screenshot-capture';
import { SlideScheduler } from './slide-scheduler';

export interface ScanOrchestratorInput {
  options: CheckerOptions;
  browser: CliBrowser;
}

export class ScanOrchestrator {
  async run(input: ScanOrchestratorInput): Promise<CheckResult> {
    const { options, browser } = input;
    const sessionSeed = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const bootstrapSession = `soc-bootstrap-${sessionSeed}`;
    const bootstrapClient = await createOpenedClient(bootstrapSession, browser, options);

    try {
      const bootstrapNavigator = new PageNavigator(bootstrapClient, { wait: options.wait });
      await bootstrapNavigator.waitForReady();

      const totalSlides = await bootstrapNavigator.getTotalSlides();
      if (totalSlides === 0) {
        throw new Error('No slides found in the presentation');
      }

      const pages = parsePageRange(options.pages, totalSlides);
      const reporter = new ConsoleReporter(options.verbose);
      const detectionConfig: DetectionConfig = {
        textOverflow: true,
        elementOverflow: true,
        scrollbar: true,
        exclude: options.exclude ?? ['.slidev-page-indicator', '.slidev-nav'],
        threshold: options.threshold ?? 1,
      };

      let slideMapper: SlideMapper | null = null;
      if (options.project) {
        try {
          slideMapper = new SlideMapper();
          await slideMapper.loadProject(options.project);
        } catch (error) {
          console.warn('Warning: Could not load project markdown:', error);
        }
      }

      const scheduler = new SlideScheduler(pages);
      const concurrency =
        options.concurrency && Number.isInteger(options.concurrency) && options.concurrency > 0
          ? options.concurrency
          : 1;
      const workerResults = await Promise.all(
        Array.from({ length: concurrency }, (_, workerIndex) =>
          this.runWorker({
            workerIndex,
            sessionSeed,
            browser,
            options,
            reporter,
            scheduler,
            totalSlides,
            detectionConfig,
            slideMapper,
          })
        )
      );

      const slides = workerResults.flat().sort((a, b) => a.page - b.page);
      const result = aggregateResults(totalSlides, slides);
      reporter.reportSummary(result);
      await outputReports(result, options);
      return result;
    } finally {
      await bootstrapClient.close();
    }
  }

  private async runWorker(params: {
    workerIndex: number;
    sessionSeed: string;
    browser: CliBrowser;
    options: CheckerOptions;
    reporter: ConsoleReporter;
    scheduler: SlideScheduler;
    totalSlides: number;
    detectionConfig: DetectionConfig;
    slideMapper: SlideMapper | null;
  }): Promise<SlideResult[]> {
    const {
      workerIndex,
      sessionSeed,
      browser,
      options,
      reporter,
      scheduler,
      totalSlides,
      detectionConfig,
      slideMapper,
    } = params;

    const session = `soc-worker-${sessionSeed}-${workerIndex}`;
    const client = await createOpenedClient(session, browser, options);
    const navigator = new PageNavigator(client, { wait: options.wait });
    const detector = new Detector(client, detectionConfig);
    const capture = new ScreenshotCapture(client);
    const results: SlideResult[] = [];

    try {
      await navigator.waitForReady();

      for (;;) {
        const slideNumber = scheduler.next();
        if (slideNumber === null) {
          break;
        }

        reporter.reportSlideStart(slideNumber, totalSlides);
        await navigator.navigateToSlide(slideNumber);

        let issues = await detector.detectIssues();
        if (slideMapper) {
          issues = issues.map(issue => slideMapper.addSourceInfo(slideNumber, issue));
        }

        reporter.reportSlideIssues(slideNumber, issues);

        let screenshotPath: string | undefined;
        if (options.screenshot?.enabled && issues.length > 0) {
          const outputDir = options.screenshot.outputDir ?? './screenshots';
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          screenshotPath = join(outputDir, `slide-${slideNumber}-${timestamp}-w${workerIndex}.png`);

          if (options.screenshot.highlightIssues ?? true) {
            const selectors = issues.map(issue => issue.element.selector);
            await capture.captureWithHighlights(screenshotPath, selectors, {
              fullPage: options.screenshot.fullPage ?? false,
            });
          } else {
            await capture.takeScreenshot(screenshotPath, {
              fullPage: options.screenshot.fullPage ?? false,
            });
          }
        }

        if (issues.length > 0) {
          results.push({
            page: slideNumber,
            issueCount: issues.length,
            issues,
            screenshot: screenshotPath,
          });
        }
      }
    } finally {
      await client.close();
    }

    return results;
  }
}

function parsePageRange(range: string | undefined, totalSlides: number): number[] {
  if (!range) {
    return Array.from({ length: totalSlides }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const parts = range.split(',');

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(value => parseInt(value.trim(), 10));
      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid page range: ${trimmed}`);
      }
      for (let i = start; i <= Math.min(end, totalSlides); i++) {
        pages.push(i);
      }
      continue;
    }

    const pageNum = parseInt(trimmed, 10);
    if (isNaN(pageNum)) {
      throw new Error(`Invalid page number: ${trimmed}`);
    }
    if (pageNum >= 1 && pageNum <= totalSlides) {
      pages.push(pageNum);
    }
  }

  return [...new Set(pages)].sort((a, b) => a - b);
}

function aggregateResults(totalSlides: number, slides: SlideResult[]): CheckResult {
  const slidesWithIssues = slides.map(item => item.page);
  const issuesFound = slides.reduce((sum, item) => sum + item.issueCount, 0);

  const textOverflowSlides = new Set<number>();
  const elementOverflowSlides = new Set<number>();
  const scrollbarSlides = new Set<number>();

  for (const slide of slides) {
    for (const issue of slide.issues) {
      if (issue.type === 'text-overflow') {
        textOverflowSlides.add(slide.page);
      } else if (issue.type === 'element-overflow') {
        elementOverflowSlides.add(slide.page);
      } else if (issue.type === 'scrollbar') {
        scrollbarSlides.add(slide.page);
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalSlides,
    slidesWithIssues,
    issuesFound,
    summary: {
      textOverflow: {
        count: textOverflowSlides.size,
        slides: Array.from(textOverflowSlides).sort((a, b) => a - b),
      },
      elementOverflow: {
        count: elementOverflowSlides.size,
        slides: Array.from(elementOverflowSlides).sort((a, b) => a - b),
      },
      scrollbar: {
        count: scrollbarSlides.size,
        slides: Array.from(scrollbarSlides).sort((a, b) => a - b),
      },
    },
    slides,
  };
}

async function outputReports(result: CheckResult, options: CheckerOptions): Promise<void> {
  const formats = options.format ?? ['console'];
  const outputDir = options.output ?? './reports';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (const format of formats) {
    try {
      if (format === 'json') {
        const reporter = new JsonReporter();
        await reporter.report(result, join(outputDir, `overflow-report-${timestamp}.json`));
      } else if (format === 'html') {
        const reporter = new HtmlReporter();
        await reporter.report(result, join(outputDir, `overflow-report-${timestamp}.html`));
      }
    } catch (error) {
      console.error(`Error generating ${format} report:`, error);
    }
  }
}
