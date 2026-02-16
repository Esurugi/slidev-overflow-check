import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface OpenOptions {
  browser?: 'chrome' | 'msedge' | 'firefox' | 'webkit';
  headed?: boolean;
  persistent?: boolean;
  profile?: string;
  url?: string;
}

export class PlaywrightCliClient {
  private readonly session: string;
  private readonly workDir: string;
  private closed = false;

  private constructor(session: string, workDir: string) {
    this.session = session;
    this.workDir = workDir;
  }

  static async create(session: string): Promise<PlaywrightCliClient> {
    const workDir = await mkdtemp(join(tmpdir(), 'slidev-overflow-pwcli-'));
    return new PlaywrightCliClient(session, workDir);
  }

  async open(options: OpenOptions = {}): Promise<string> {
    const args: string[] = ['open'];
    if (options.url) {
      args.push(options.url);
    }
    if (options.browser) {
      args.push('--browser', options.browser);
    }
    if (options.headed) {
      args.push('--headed');
    }
    if (options.persistent) {
      args.push('--persistent');
    }
    if (options.profile) {
      args.push('--profile', options.profile);
    }
    return this.runSessionCommand(args);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    try {
      await this.runSessionCommand(['close']);
    } catch {
      // noop
    } finally {
      this.closed = true;
      await this.cleanupWorkDir();
    }
  }

  async goto(url: string): Promise<void> {
    await this.runSessionCommand(['goto', url]);
  }

  async resize(width: number, height: number): Promise<void> {
    await this.runSessionCommand(['resize', String(width), String(height)]);
  }

  async evalJson<T>(func: string): Promise<T> {
    const wrapped = this.buildRunCode(func, true);
    const output = await this.runSessionCommand(['run-code', wrapped]);
    const resultBlock = this.extractResultBlock(output);

    if (!resultBlock) {
      throw new Error(
        `playwright-cli eval output does not contain a result block.\nRaw output:\n${output}`
      );
    }

    try {
      const first = JSON.parse(resultBlock) as unknown;
      if (typeof first === 'string') {
        try {
          return JSON.parse(first) as T;
        } catch {
          return first as T;
        }
      }
      return first as T;
    } catch (error) {
      throw new Error(
        `Failed to parse eval result as JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async evalVoid(func: string): Promise<void> {
    const wrapped = this.buildRunCode(func, false);
    await this.runSessionCommand(['run-code', wrapped]);
  }

  async snapshot(filename?: string): Promise<void> {
    const args = ['snapshot'];
    if (filename) {
      args.push('--filename', filename);
    }
    await this.runSessionCommand(args);
  }

  async screenshot(filename: string, fullPage = false): Promise<void> {
    const args = ['screenshot', '--filename', filename];
    if (fullPage) {
      args.push('--full-page');
    }
    await this.runSessionCommand(args);
  }

  static async list(): Promise<string> {
    return this.runGlobalCommand(['list']);
  }

  static async closeAll(): Promise<void> {
    await this.runGlobalCommand(['close-all']);
  }

  static async killAll(): Promise<void> {
    await this.runGlobalCommand(['kill-all']);
  }

  private extractResultBlock(output: string): string | null {
    const resultHeader = '### Result';
    const start = output.indexOf(resultHeader);
    if (start === -1) {
      return null;
    }

    const afterHeader = output.slice(start + resultHeader.length).trimStart();
    const nextSectionIndex = afterHeader.search(/\n###\s+/);
    const sectionBody =
      nextSectionIndex === -1 ? afterHeader : afterHeader.slice(0, nextSectionIndex);

    return sectionBody.trim();
  }

  private buildRunCode(func: string, returnValue: boolean): string {
    const trimmed = func.trim();
    const serializedFunc = JSON.stringify(trimmed);
    if (returnValue) {
      return `async page => { const pageFn = (0, eval)(${serializedFunc}); const value = await page.evaluate(pageFn); return JSON.stringify(value); }`;
    }
    return `async page => { const pageFn = (0, eval)(${serializedFunc}); await page.evaluate(pageFn); }`;
  }

  private async runSessionCommand(args: string[]): Promise<string> {
    return PlaywrightCliClient.runCommand([`-s=${this.session}`, ...args], this.workDir);
  }

  private static async runGlobalCommand(args: string[]): Promise<string> {
    const workDir = await mkdtemp(join(tmpdir(), 'slidev-overflow-pwcli-global-'));
    try {
      return await this.runCommand(args, workDir);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private static async runCommand(args: string[], cwd: string): Promise<string> {
    const command = `playwright-cli ${args.join(' ')}`;
    try {
      const { stdout, stderr } = await this.execPlaywrightCli(args, cwd);
      return `${stdout}${stderr}`;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new Error(
          `playwright-cli command not found. Install it and ensure it is in PATH. (${command})`
        );
      }

      const stdout = error && typeof error === 'object' && 'stdout' in error ? String(error.stdout ?? '') : '';
      const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr ?? '') : '';
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `playwright-cli command failed: ${command}\n${message}\n${stdout}\n${stderr}`.trim()
      );
    }
  }

  private static async execPlaywrightCli(args: string[], cwd: string) {
    if (process.platform !== 'win32') {
      return execFileAsync('playwright-cli', args, { cwd, windowsHide: true });
    }

    const cliScript = join(
      process.env.APPDATA ?? '',
      'npm',
      'node_modules',
      '@playwright',
      'cli',
      'playwright-cli.js'
    );
    if (existsSync(cliScript)) {
      return execFileAsync('node', [cliScript, ...args], { cwd, windowsHide: true });
    }

    return execFileAsync('npx', ['playwright-cli', ...args], { cwd, windowsHide: true });
  }

  private async cleanupWorkDir(): Promise<void> {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await rm(this.workDir, { recursive: true, force: true });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isBusy = message.includes('EBUSY') || message.includes('ENOTEMPTY');
        if (!isBusy || attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }
}
