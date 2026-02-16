import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/interfaces/cli/command';
import { runOverflowCheck } from '../../src/application/usecases/run-overflow-check';
import { CheckResult } from '../../src/types';

vi.mock('../../src/application/usecases/run-overflow-check', () => ({
  runOverflowCheck: vi.fn(),
}));

describe('runCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('should throw when --url is missing', async () => {
    await expect(runCli(['node', 'slidev-overflow-check'])).rejects.toThrow('--url option is required');
    expect(runOverflowCheck).not.toHaveBeenCalled();
  });

  it('should parse options and set exit code with --fail-on-issues', async () => {
    const result: CheckResult = {
      timestamp: new Date().toISOString(),
      totalSlides: 2,
      slidesWithIssues: [2],
      issuesFound: 1,
      summary: {
        textOverflow: { count: 1, slides: [2] },
        elementOverflow: { count: 0, slides: [] },
        scrollbar: { count: 0, slides: [] },
      },
      slides: [],
    };
    vi.mocked(runOverflowCheck).mockResolvedValue(result);

    await runCli([
      'node',
      'slidev-overflow-check',
      '--url',
      'http://localhost:3030',
      '--fail-on-issues',
    ]);

    expect(runOverflowCheck).toHaveBeenCalledOnce();
    expect(runOverflowCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3030',
        failOnIssues: true,
        threshold: 1,
        wait: 0,
        concurrency: 1,
      })
    );
    expect(process.exitCode).toBe(1);
  });
});
