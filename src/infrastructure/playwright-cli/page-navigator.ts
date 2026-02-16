import { PlaywrightCliClient } from './client';

export interface NavigatorOptions {
  wait?: number;
}

export class PageNavigator {
  private client: PlaywrightCliClient;
  private options: NavigatorOptions;
  private totalSlides?: number;

  constructor(client: PlaywrightCliClient, options: NavigatorOptions = {}) {
    this.client = client;
    this.options = {
      wait: options.wait ?? 0,
    };
  }

  async getTotalSlides(): Promise<number> {
    try {
      return await this.client.evalJson<number>(`() => {
        if (typeof window.$slidev !== 'undefined' && window.$slidev.nav && typeof window.$slidev.nav.total === 'number') {
          return window.$slidev.nav.total;
        }
        if (typeof window.__slidev__ !== 'undefined' && window.__slidev__.nav && typeof window.__slidev__.nav.total === 'number') {
          return window.__slidev__.nav.total;
        }
        const indicator = document.querySelector('.slidev-page-indicator');
        if (indicator) {
          const text = indicator.textContent || '';
          const match = text.match(/\\/\\s*(\\d+)/);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
        return document.querySelectorAll('.slidev-page').length;
      }`);
    } catch {
      return 0;
    }
  }

  async navigateToSlide(slideNumber: number): Promise<void> {
    await this.client.evalVoid(`() => {
      const n = ${slideNumber};
      if (typeof window.navigateToSlide === 'function') {
        window.navigateToSlide(n);
      } else if (typeof window.$slidev !== 'undefined') {
        window.$slidev.nav.go(n);
      } else if (typeof window.__slidev__ !== 'undefined' && window.__slidev__.nav && typeof window.__slidev__.nav.go === 'function') {
        window.__slidev__.nav.go(n);
      } else {
        window.location.hash = '' + n;
      }
    }`);

    await this.waitForSlideLoad(slideNumber);
  }

  async getCurrentSlideNumber(): Promise<number> {
    try {
      return await this.client.evalJson<number>(`() => {
        const indicator = document.querySelector('.slidev-page-number');
        if (indicator) {
          const num = parseInt(indicator.textContent || '0', 10);
          return num || 1;
        }
        const hash = window.location.hash;
        if (hash) {
          const match = hash.match(/(\\d+)/);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
        return 1;
      }`);
    } catch {
      return 1;
    }
  }

  async waitForReady(): Promise<void> {
    await this.waitForCondition(
      `() => Boolean(document.querySelector('.slidev-page'))`,
      10000
    );

    await this.waitForCondition(
      `() => {
        return (typeof window.$slidev !== 'undefined' && window.$slidev.nav) ||
               (typeof window.__slidev__ !== 'undefined') ||
               document.querySelectorAll('.slidev-page').length > 0;
      }`,
      5000
    );

    if (!this.totalSlides) {
      this.totalSlides = await this.getTotalSlides();
    }
  }

  private async waitForSlideLoad(targetSlide: number): Promise<void> {
    await this.waitForCondition(
      `() => {
        const active = document.querySelector('.slidev-page.active');
        if (active) {
          const attr = active.getAttribute('data-slidev-no') || active.getAttribute('data-page');
          if (attr) {
            return Number(attr) === ${targetSlide};
          }

          const hashMatch = window.location.hash.match(/(\\d+)/);
          if (hashMatch) {
            return Number(hashMatch[1]) === ${targetSlide};
          }

          return true;
        }

        const visible = Array.from(document.querySelectorAll('.slidev-page')).find(page => {
          const rect = page.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (!visible) {
          return false;
        }

        const attr = visible.getAttribute('data-slidev-no') || visible.getAttribute('data-page');
        if (!attr) {
          return true;
        }
        return Number(attr) === ${targetSlide};
      }`,
      3000
    );

    const minWait = this.options.wait ?? 0;
    if (minWait > 0) {
      await this.sleep(minWait);
    }
  }

  private async waitForCondition(func: string, timeoutMs: number): Promise<void> {
    const intervalMs = 50;
    const start = Date.now();

    while (Date.now() - start <= timeoutMs) {
      try {
        const passed = await this.client.evalJson<boolean>(func);
        if (passed) {
          return;
        }
      } catch {
        // retry
      }
      await this.sleep(intervalMs);
    }

    throw new Error(`Timeout waiting for condition (${timeoutMs}ms)`);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}
