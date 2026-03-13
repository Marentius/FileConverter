import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import logger from '../../logger';
import {
  stripHtml,
  stripMarkdown,
  renderTextToPdf,
  wrapInHtmlDocument,
  htmlToMarkdown,
} from './html-renderers';

/**
 * Document adapter using pure JavaScript libraries.
 * Handles Markdown/HTML/TXT conversions.
 *
 * - marked: Markdown -> HTML
 * - pdfkit (via html-renderers): Text/HTML -> PDF
 * - turndown (via html-renderers): HTML -> Markdown
 */
export class DocumentAdapter extends BaseAdapter {
  readonly name = 'document';
  readonly supportedInputFormats = ['md', 'markdown', 'html', 'htm', 'txt'];
  readonly supportedOutputFormats = ['pdf', 'html', 'txt', 'md'];

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      this.validateParameters(parameters);

      if (!fs.existsSync(plan.inputPath)) {
        throw new Error(`Input file not found: ${plan.inputPath}`);
      }
      this.validateInputFileSize(plan.inputPath);

      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputContent = fs.readFileSync(plan.inputPath, 'utf-8');
      const inputFmt = plan.inputFormat.toLowerCase();
      const outputFmt = plan.outputFormat.toLowerCase();

      logger.debug('Document adapter: Starting conversion', {
        input: plan.inputPath,
        output: plan.outputPath,
        inputFormat: inputFmt,
        outputFormat: outputFmt,
      });

      if (outputFmt === 'pdf') {
        logger.warn(
          'PDF output uses basic text rendering. Formatting, images, and tables will not be preserved. For best results, convert to HTML instead.'
        );
        await this.convertToPdf(inputContent, inputFmt, plan.outputPath);
      } else if (outputFmt === 'html' || outputFmt === 'htm') {
        this.convertToHtml(inputContent, inputFmt, plan.outputPath);
      } else if (outputFmt === 'md' || outputFmt === 'markdown') {
        this.convertToMarkdown(inputContent, inputFmt, plan.outputPath);
      } else if (outputFmt === 'txt') {
        this.convertToText(inputContent, inputFmt, plan.outputPath);
      } else {
        throw new Error(`Unsupported output format: ${outputFmt}`);
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(plan.outputPath) ? fs.statSync(plan.outputPath).size : 0;

      logger.debug('Document adapter: Conversion completed', {
        input: plan.inputPath,
        output: plan.outputPath,
        duration,
        outputSize,
      });

      return {
        success: true,
        outputPath: plan.outputPath,
        duration,
        metadata: { size: outputSize, format: outputFmt },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Document adapter: Conversion failed', {
        input: plan.inputPath,
        output: plan.outputPath,
        error: errorMessage,
        duration,
      });

      return { success: false, outputPath: plan.outputPath, duration, error: errorMessage };
    }
  }

  private convertToPdf(content: string, inputFormat: string, outputPath: string): Promise<void> {
    let textContent = content;
    if (inputFormat === 'md' || inputFormat === 'markdown') {
      textContent = stripMarkdown(content);
    } else if (inputFormat === 'html' || inputFormat === 'htm') {
      textContent = stripHtml(content);
    }

    return renderTextToPdf(textContent, outputPath);
  }

  private convertToHtml(content: string, inputFormat: string, outputPath: string): void {
    let html: string;

    if (inputFormat === 'md' || inputFormat === 'markdown') {
      html = marked.parse(content, { async: false }) as string;
      html = wrapInHtmlDocument(html);
    } else if (inputFormat === 'txt') {
      const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = wrapInHtmlDocument(`<pre>${escaped}</pre>`);
    } else {
      html = content;
    }

    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  private convertToMarkdown(content: string, inputFormat: string, outputPath: string): void {
    let md: string;

    if (inputFormat === 'html' || inputFormat === 'htm') {
      md = htmlToMarkdown(content);
    } else {
      md = content;
    }

    fs.writeFileSync(outputPath, md, 'utf-8');
  }

  private convertToText(content: string, inputFormat: string, outputPath: string): void {
    let text: string;

    if (inputFormat === 'html' || inputFormat === 'htm') {
      text = stripHtml(content);
    } else if (inputFormat === 'md' || inputFormat === 'markdown') {
      text = stripMarkdown(content);
    } else {
      text = content;
    }

    fs.writeFileSync(outputPath, text, 'utf-8');
  }
}
