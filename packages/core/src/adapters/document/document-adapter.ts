import { marked } from 'marked';
import PDFDocument from 'pdfkit';
import TurndownService from 'turndown';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import logger from '../../logger';

/**
 * Document adapter using pure JavaScript libraries.
 * Replaces Pandoc for Markdown/HTML/TXT conversions.
 *
 * - marked: Markdown -> HTML
 * - pdfkit: Text/HTML -> PDF
 * - turndown: HTML -> Markdown
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

  /**
   * Convert input content to PDF using pdfkit.
   * Markdown is first converted to plain text lines for rendering.
   */
  private convertToPdf(content: string, inputFormat: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      let textContent = content;
      if (inputFormat === 'md' || inputFormat === 'markdown') {
        textContent = this.stripMarkdown(content);
      } else if (inputFormat === 'html' || inputFormat === 'htm') {
        textContent = this.stripHtml(content);
      }

      doc.fontSize(12).text(textContent, { lineGap: 4 });
      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private convertToHtml(content: string, inputFormat: string, outputPath: string): void {
    let html: string;

    if (inputFormat === 'md' || inputFormat === 'markdown') {
      html = marked.parse(content, { async: false }) as string;
      html = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${html}\n</body>\n</html>`;
    } else if (inputFormat === 'txt') {
      const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n<pre>${escaped}</pre>\n</body>\n</html>`;
    } else {
      html = content;
    }

    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  private convertToMarkdown(content: string, inputFormat: string, outputPath: string): void {
    let md: string;

    if (inputFormat === 'html' || inputFormat === 'htm') {
      const turndown = new TurndownService();
      md = turndown.turndown(content);
    } else if (inputFormat === 'txt') {
      md = content;
    } else {
      md = content;
    }

    fs.writeFileSync(outputPath, md, 'utf-8');
  }

  private convertToText(content: string, inputFormat: string, outputPath: string): void {
    let text: string;

    if (inputFormat === 'html' || inputFormat === 'htm') {
      text = this.stripHtml(content);
    } else if (inputFormat === 'md' || inputFormat === 'markdown') {
      text = this.stripMarkdown(content);
    } else {
      text = content;
    }

    fs.writeFileSync(outputPath, text, 'utf-8');
  }

  /** Strip HTML tags and decode basic entities. */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Convert markdown to plain text by stripping syntax. */
  private stripMarkdown(md: string): string {
    const html = marked.parse(md, { async: false }) as string;
    return this.stripHtml(html);
  }
}
