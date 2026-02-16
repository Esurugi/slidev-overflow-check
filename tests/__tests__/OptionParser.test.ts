import { describe, expect, it } from 'vitest';
import { parseCliOptions } from '../../src/interfaces/cli/option-parser';

describe('parseCliOptions', () => {
  it('should parse viewport and numeric options', () => {
    const parsed = parseCliOptions(
      {
        viewport: '1280x720',
        threshold: '3',
        wait: '50',
        concurrency: '4',
        format: 'console,json',
        browser: 'chrome',
        headless: true,
      },
      {}
    );

    expect(parsed.viewport).toEqual({ width: 1280, height: 720 });
    expect(parsed.threshold).toBe(3);
    expect(parsed.wait).toBe(50);
    expect(parsed.concurrency).toBe(4);
    expect(parsed.format).toEqual(['console', 'json']);
    expect(parsed.browser).toBe('chrome');
  });

  it('should throw on invalid viewport', () => {
    expect(() => parseCliOptions({ viewport: 'invalid' }, {})).toThrow('Invalid viewport size format');
  });

  it('should throw on invalid concurrency', () => {
    expect(() => parseCliOptions({ concurrency: 'abc' }, {})).toThrow(
      '--concurrency must be an integer greater than or equal to 1'
    );
  });

  it('should throw on invalid threshold', () => {
    expect(() => parseCliOptions({ threshold: 'abc' }, {})).toThrow('--threshold must be a valid number');
  });
});
