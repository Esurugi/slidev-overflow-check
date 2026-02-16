import { readFile } from 'fs/promises';
import { join } from 'path';
import { EnhancedMarkdownParser } from '../../infrastructure/markdown/enhanced-markdown-parser';
import { createDefaultCalibration, TextPredictor } from '../../core/analysis/text-prediction';
import { CheckResult, ContentAnalysisResult, CheckerOptions } from '../../types';

export class AnalysisOrchestrator {
  async analyze(options: CheckerOptions, result: CheckResult): Promise<ContentAnalysisResult | undefined> {
    if (!options.project || options.contentAnalysis?.disableAutoAnalysis) {
      return undefined;
    }

    const start = Date.now();
    const markdown = await this.loadSlidesMarkdown(options.project);
    const parser = new EnhancedMarkdownParser();
    const predictor = new TextPredictor(createDefaultCalibration());
    const presentation = parser.parsePresentation(markdown);

    const predicted = presentation.slides.flatMap(slide =>
      slide.contentNodes
        .filter(node => node.type === 'heading' && typeof node.text === 'string')
        .map(node => ({
          level: node.level ?? 3,
          text: node.text ?? '',
          lineStart: node.lineStart,
          lineEnd: node.lineEnd,
          slideIndex: slide.index + 1,
        }))
        .filter(heading => predictor.predictHeadingOverflow(heading.text, heading.level))
        .map(heading => ({
          type: 'text-overflow' as const,
          element: `h${heading.level}`,
          slideIndex: slide.slideIndex,
          riskLevel: 'medium' as const,
          lineRange: { start: heading.lineStart, end: heading.lineEnd },
          recommendation: 'Consider shortening heading text or splitting content.',
          confirmed: result.slidesWithIssues.includes(slide.slideIndex),
          confidence: 'medium' as const,
        }))
    );

    return {
      enabled: true,
      analysisTime: Date.now() - start,
      mode: {
        type: 'project-directory',
        capabilities: {
          markdownParsing: true,
          assetSizeDetection: false,
          configFileAccess: true,
          themeAnalysis: false,
          accuracyLevel: 'basic',
        },
      },
      presentationMetrics: {
        totalSlides: result.totalSlides,
        averageComplexity: 0,
        highRiskSlideCount: predicted.filter(item => item.riskLevel === 'high').length,
        mediumRiskSlideCount: predicted.filter(item => item.riskLevel === 'medium').length,
        lowRiskSlideCount: predicted.filter(item => item.riskLevel === 'low').length,
        mostComplexSlide: 1,
        contentDistribution: {
          textHeavy: predicted.length,
          codeHeavy: 0,
          balanced: Math.max(0, result.totalSlides - predicted.length),
        },
      },
      predictions: {
        totalPredicted: predicted.length,
        totalActual: result.issuesFound,
        accuracy: {
          predicted: predicted.length,
          confirmed: predicted.filter(item => item.confirmed).length,
          falsePositives: predicted.filter(item => !item.confirmed).length,
          falseNegatives: 0,
          precision: predicted.length === 0 ? 1 : predicted.filter(item => item.confirmed).length / predicted.length,
          recall: 0,
        },
        predictions: predicted,
      },
      slideAnalysis: [],
    };
  }

  private async loadSlidesMarkdown(projectPath: string): Promise<string> {
    const candidates = ['slides.md', 'index.md', 'README.md'];
    for (const file of candidates) {
      try {
        return await readFile(join(projectPath, file), 'utf-8');
      } catch {
        // try next
      }
    }
    throw new Error(`No Slidev markdown file found in ${projectPath}`);
  }
}
