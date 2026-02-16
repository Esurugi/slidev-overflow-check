import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import { Detector } from '../../src/core/detection/detector';
import { DetectionConfig } from '../../src/types';
import { PlaywrightCliClient } from '../../src/infrastructure/playwright-cli/client';

describe('Detector', () => {
  let client: PlaywrightCliClient;
  let server: Server;
  let serverUrl: string;
  let currentHtml = '';

  const defaultConfig: DetectionConfig = {
    textOverflow: true,
    elementOverflow: true,
    scrollbar: true,
    exclude: ['.slidev-page-indicator', '.slidev-nav'],
    threshold: 1,
  };

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

    client = await PlaywrightCliClient.create(`test-overflow-${Date.now()}`);
    await client.open({ browser: 'chrome' });
  });

  afterAll(async () => {
    await client.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('should detect text overflow when content exceeds container', async () => {
    currentHtml = `
      <html>
        <body>
          <div class="slidev-page" style="width: 980px; height: 552px; position: relative;">
            <div class="slidev-layout">
              <div style="width: 200px;">
                <h1 style="width: 500px; white-space: nowrap; overflow: hidden;">
                  This is a very long title that will overflow
                </h1>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    await client.goto(serverUrl);
    const detector = new Detector(client, defaultConfig);
    const issues = await detector.detectIssues();
    const textOverflowIssues = issues.filter(i => i.type === 'text-overflow');
    expect(textOverflowIssues.length).toBeGreaterThan(0);
  });

  it('should detect element overflow', async () => {
    currentHtml = `
      <html>
        <body>
          <div class="slidev-page" style="position: relative; width: 300px; height: 200px; overflow: hidden;">
            <div class="slidev-layout">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                   style="position: absolute; left: 260px; width: 200px; height: 100px;"
                   alt="Overflowing image" />
            </div>
          </div>
        </body>
      </html>
    `;
    await client.goto(serverUrl);
    const detector = new Detector(client, defaultConfig);
    const issues = await detector.detectIssues();
    const elementOverflows = issues.filter(i => i.type === 'element-overflow');
    expect(elementOverflows.length).toBeGreaterThan(0);
  });
});
