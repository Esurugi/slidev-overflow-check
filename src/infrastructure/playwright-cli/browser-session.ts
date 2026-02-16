import { CheckerOptions } from '../../types';
import { PlaywrightCliClient } from './client';

export type CliBrowser = 'chrome' | 'msedge' | 'firefox' | 'webkit';

export async function resolveBrowser(options: CheckerOptions): Promise<CliBrowser> {
  const requested = options.browser ?? 'auto';
  if (requested !== 'auto') {
    return requested;
  }

  const probeCandidates: CliBrowser[] = ['chrome', 'msedge', 'firefox', 'webkit'];
  const errors: string[] = [];

  for (const candidate of probeCandidates) {
    const session = `soc-probe-${Date.now()}-${candidate}`;
    const client = await PlaywrightCliClient.create(session);
    try {
      await client.open({
        browser: candidate,
        headed: !(options.headless ?? true),
      });
      return candidate;
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await client.close();
    }
  }

  throw new Error(
    `No available browser for playwright-cli. Try installing browsers with "playwright-cli install-browser <name>".\n${errors.join('\n')}`
  );
}

export async function createOpenedClient(session: string, browser: CliBrowser, options: CheckerOptions): Promise<PlaywrightCliClient> {
  const client = await PlaywrightCliClient.create(session);
  await client.open({
    browser,
    headed: !(options.headless ?? true),
  });
  await client.resize(options.viewport?.width ?? 1920, options.viewport?.height ?? 1080);
  await client.goto(options.url || '');
  return client;
}
