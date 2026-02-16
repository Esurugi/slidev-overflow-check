import { createServer } from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runOverflowCheck } from '../../src/application/usecases/run-overflow-check';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBenchmark(iterations = 3): Promise<void> {
  const html = fs.readFileSync(join(__dirname, '..', 'fixtures', 'test-slides.html'), 'utf-8');

  const server = createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });

  const url = await new Promise<string>(resolve => {
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve(`http://localhost:${address.port}`);
      }
    });
  });

  const samples: number[] = [];

  try {
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await runOverflowCheck({
        url,
        wait: 0,
        headless: true,
        verbose: false,
        browser: 'auto',
      });
      samples.push(performance.now() - start);
    }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const average = samples.reduce((sum, current) => sum + current, 0) / samples.length;

  console.log('Benchmark samples (ms):', samples.map(v => v.toFixed(2)).join(', '));
  console.log('Median (ms):', median.toFixed(2));
  console.log('Average (ms):', average.toFixed(2));
}

const iterations = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
runBenchmark(iterations).catch(error => {
  console.error(error);
  process.exit(1);
});
