import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { PlaywrightCliClient } from '../playwright-cli/client';

export interface ScreenshotCaptureOptions {
  fullPage?: boolean;
  highlightColor?: string;
}

/**
 * Class for managing screenshot capture
 */
export class ScreenshotCapture {
  private client: PlaywrightCliClient;

  constructor(client: PlaywrightCliClient) {
    this.client = client;
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(
    filePath: string,
    options: ScreenshotCaptureOptions = {}
  ): Promise<void> {
    const { fullPage = false } = options;

    // Create directory if it does not exist
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await this.client.screenshot(filePath, fullPage);
  }

  /**
   * Highlight elements
   */
  async highlightElements(
    selectors: string[],
    color: string = 'rgba(255, 0, 0, 0.5)'
  ): Promise<void> {
    const payload = JSON.stringify({ selectors, color });
    await this.client.evalVoid(`() => {
        const { selectors, color } = ${payload};
        selectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            const htmlElement = element;
            htmlElement.style.outline = '3px solid ' + color;
            htmlElement.style.outlineOffset = '2px';
            htmlElement.setAttribute('data-highlighted', 'true');
          });
        });
      }`);
  }

  /**
   * Clear highlights
   */
  async clearHighlights(): Promise<void> {
    await this.client.evalVoid(`() => {
      const highlightedElements = document.querySelectorAll('[data-highlighted="true"]');
      highlightedElements.forEach((element) => {
        const htmlElement = element;
        htmlElement.style.outline = '';
        htmlElement.style.outlineOffset = '';
        htmlElement.removeAttribute('data-highlighted');
      });
    }`);
  }

  /**
   * Take screenshot with highlighted issues
   */
  async captureWithHighlights(
    filePath: string,
    selectors: string[],
    options: ScreenshotCaptureOptions = {}
  ): Promise<void> {
    try {
      // Highlight display
      await this.highlightElements(selectors, options.highlightColor);

      // Take screenshot
      await this.takeScreenshot(filePath, options);
    } finally {
      // Clear highlights
      await this.clearHighlights();
    }
  }
}
