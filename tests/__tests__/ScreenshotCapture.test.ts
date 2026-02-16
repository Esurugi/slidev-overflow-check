import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import { ScreenshotCapture } from '../../src/infrastructure/capture/screenshot-capture';
import { existsSync, rmSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { PlaywrightCliClient } from '../../src/infrastructure/playwright-cli/client';

describe('ScreenshotCapture', () => {
  let client: PlaywrightCliClient;
  let server: Server;
  let serverUrl: string;
  const testDir = join(__dirname, '..', 'screenshots-test');

  beforeAll(async () => {
    const html = `
      <html>
        <body>
          <div class="overflow-box" style="width: 100px; height: 50px; overflow: hidden; background: red;">
            <div class="content" style="width: 200px; height: 100px; background: blue;">This is overflow content</div>
          </div>
        </body>
      </html>
    `;

    server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
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

    await mkdir(testDir, { recursive: true });
    client = await PlaywrightCliClient.create(`test-shot-${Date.now()}`);
    await client.open({ browser: 'chrome' });
    await client.goto(serverUrl);
  });

  afterAll(async () => {
    await client.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should capture screenshot of the page', async () => {
    const capture = new ScreenshotCapture(client);
    const filePath = join(testDir, 'test-1.png');
    await capture.takeScreenshot(filePath);
    expect(existsSync(filePath)).toBe(true);
    await unlink(filePath);
  });

  it('should highlight and clear elements', async () => {
    const capture = new ScreenshotCapture(client);
    await capture.highlightElements(['.overflow-box']);
    const hasHighlight = await client.evalJson<boolean>(`() => {
      const element = document.querySelector('.overflow-box');
      return Boolean(element) && element.hasAttribute('data-highlighted');
    }`);
    expect(hasHighlight).toBe(true);

    await capture.clearHighlights();
    const cleared = await client.evalJson<boolean>(`() => {
      const element = document.querySelector('.overflow-box');
      return Boolean(element) && !element.hasAttribute('data-highlighted');
    }`);
    expect(cleared).toBe(true);
  });
});
