import { PlaywrightCliClient } from '../../infrastructure/playwright-cli/client';
import { DetectionConfig, Issue } from '../../types';
import { buildDetectorScript, DetectionBundle } from './detector-script-builder';
import { normalizeDetectionBundle } from './detector-normalizer';

export class Detector {
  private client: PlaywrightCliClient;
  private config: DetectionConfig;

  constructor(client: PlaywrightCliClient, config: DetectionConfig) {
    this.client = client;
    this.config = config;
  }

  async detectIssues(): Promise<Issue[]> {
    const script = buildDetectorScript(this.config);
    const bundle = await this.client.evalJson<DetectionBundle>(script);
    return normalizeDetectionBundle(bundle);
  }
}
