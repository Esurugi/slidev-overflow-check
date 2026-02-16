import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, Server } from 'http';
import { PageNavigator } from '../../src/infrastructure/playwright-cli/page-navigator';
import { PlaywrightCliClient } from '../../src/infrastructure/playwright-cli/client';

describe('PageNavigator', () => {
  let client: PlaywrightCliClient;
  let server: Server;
  let serverUrl: string;
  let currentHtml = '';

  beforeAll(async () => {
    server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(currentHtml);
    });

    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          serverUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    client = await PlaywrightCliClient.create(`test-nav-${Date.now()}`);
    await client.open({ browser: 'chrome' });
  });

  afterAll(async () => {
    await client.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  beforeEach(async () => {
    currentHtml = `
      <html>
        <body>
          <div id="slideshow">
            <div class="slidev-page" data-page="1">Slide 1</div>
            <div class="slidev-page" data-page="2" style="display:none;">Slide 2</div>
            <div class="slidev-page" data-page="3" style="display:none;">Slide 3</div>
          </div>
          <script>
            window.navigateToSlide = (n) => {
              document.querySelectorAll('.slidev-page').forEach((el, i) => {
                el.style.display = i === n - 1 ? 'block' : 'none';
              });
            };
          </script>
        </body>
      </html>
    `;
    await client.goto(serverUrl);
  });

  it('should return total number of slides', async () => {
    const navigator = new PageNavigator(client, { wait: 10 });
    const total = await navigator.getTotalSlides();
    expect(total).toBe(3);
  });

  it('should navigate to specific slide number', async () => {
    const navigator = new PageNavigator(client, { wait: 10 });
    await navigator.navigateToSlide(2);

    const isVisible = await client.evalJson<boolean>(`() => {
      const slide2 = document.querySelector('[data-page="2"]');
      return Boolean(slide2) && slide2.style.display !== 'none';
    }`);
    expect(isVisible).toBe(true);
  }, 15000);

  it('should return current slide number from indicator', async () => {
    currentHtml = `
      <html>
        <body>
          <div class="slidev-page-number">5</div>
        </body>
      </html>
    `;
    await client.goto(serverUrl);

    const navigator = new PageNavigator(client, { wait: 10 });
    const current = await navigator.getCurrentSlideNumber();
    expect(current).toBe(5);
  });
});
