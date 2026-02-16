import { describe, expect, it } from 'vitest';
import { normalizeDetectionBundle } from '../../src/core/detection/detector-normalizer';

describe('normalizeDetectionBundle', () => {
  it('should flatten detection bundle into issue list', () => {
    const issues = normalizeDetectionBundle({
      textOverflow: [{ type: 'text-overflow' }],
      elementOverflow: [{ type: 'element-overflow' }],
      scrollbar: [{ type: 'scrollbar' }],
    } as any);

    expect(issues).toHaveLength(3);
    expect(issues.map(issue => issue.type)).toEqual(['text-overflow', 'element-overflow', 'scrollbar']);
  });
});
