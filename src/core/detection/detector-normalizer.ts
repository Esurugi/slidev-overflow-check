import { ElementOverflowIssue, Issue, ScrollbarIssue, TextOverflowIssue } from '../../types';
import { DetectionBundle } from './detector-script-builder';

export function normalizeDetectionBundle(bundle: DetectionBundle): Issue[] {
  return [
    ...(bundle.textOverflow as TextOverflowIssue[]),
    ...(bundle.elementOverflow as ElementOverflowIssue[]),
    ...(bundle.scrollbar as ScrollbarIssue[]),
  ];
}
