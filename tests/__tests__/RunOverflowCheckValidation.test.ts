import { describe, expect, it } from 'vitest';
import { runOverflowCheck } from '../../src/application/usecases/run-overflow-check';

describe('runOverflowCheck option validation', () => {
  it('should fail fast on invalid concurrency', async () => {
    await expect(
      runOverflowCheck({
        url: 'http://localhost:3030',
        concurrency: Number.NaN,
      })
    ).rejects.toThrow('--concurrency must be an integer greater than or equal to 1');
  });

  it('should fail fast on invalid wait value', async () => {
    await expect(
      runOverflowCheck({
        url: 'http://localhost:3030',
        wait: -1,
      })
    ).rejects.toThrow('--wait must be a non-negative number');
  });
});
