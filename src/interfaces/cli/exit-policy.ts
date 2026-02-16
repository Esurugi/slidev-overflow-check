import { CheckResult, CheckerOptions } from '../../types';

export function getExitCode(result: CheckResult, options: CheckerOptions): number {
  if (options.failOnIssues && result.issuesFound > 0) {
    return 1;
  }
  return 0;
}
