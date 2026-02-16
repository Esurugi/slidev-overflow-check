import { createServer } from 'net';
import type { ChildProcess } from 'child_process';

export class SlidevLauncher {
  private process: ChildProcess | null = null;
  private url: string | null = null;

  async findAvailablePort(startPort: number): Promise<number> {
    const maxAttempts = 100;
    for (let offset = 0; offset < maxAttempts; offset++) {
      const candidate = startPort + offset;
      const available = await this.isPortAvailable(candidate);
      if (available) {
        return candidate;
      }
    }
    throw new Error(`No available port found between ${startPort} and ${startPort + maxAttempts - 1}`);
  }

  async stop(): Promise<boolean> {
    if (!this.process) {
      return false;
    }
    const current = this.process;
    this.process = null;
    this.url = null;

    if (current.killed || current.exitCode !== null) {
      return true;
    }

    return new Promise<boolean>(resolve => {
      const timeout = setTimeout(() => {
        current.kill('SIGKILL');
        resolve(true);
      }, 3000);

      current.once('exit', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      current.kill('SIGTERM');
    });
  }

  isRunning(): boolean {
    return Boolean(this.process && !this.process.killed && this.process.exitCode === null);
  }

  getUrl(): string | null {
    return this.url;
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = createServer();
      server.unref();

      server.once('error', () => {
        resolve(false);
      });

      server.listen(port, () => {
        server.close(() => resolve(true));
      });
    });
  }
}
