import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import logger from '../../logger';

/**
 * PDF adapter using pdf-lib for merge, split, and basic optimization.
 * No external system dependencies required.
 */
export class PdfAdapter extends BaseAdapter {
  readonly name = 'pdf';
  readonly supportedInputFormats = ['pdf'];
  readonly supportedOutputFormats = ['pdf'];

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      this.validateParameters(parameters);

      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const originalSize = fs.statSync(plan.inputPath).size;
      let result: ConversionResult;

      if (parameters.operation === 'merge') {
        result = await this.mergePdfs(parameters.inputFiles ?? [plan.inputPath], plan.outputPath);
      } else if (parameters.operation === 'split') {
        result = await this.splitPdf(plan.inputPath, plan.outputPath, parameters.pages);
      } else if (parameters.operation === 'compress') {
        result = await this.optimizePdf(plan.inputPath, plan.outputPath);
      } else {
        throw new Error('Ukjent PDF-operasjon. Støttede operasjoner: compress, merge, split');
      }

      if (result.success && result.metadata) {
        result.metadata.originalSize = originalSize;
        if (fs.existsSync(plan.outputPath)) {
          result.metadata.size = fs.statSync(plan.outputPath).size;
          result.metadata.compressionRatio = originalSize > 0
            ? ((originalSize - (result.metadata.size ?? 0)) / originalSize * 100).toFixed(1) + '%'
            : '0%';
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('PDF adapter: Operation failed', {
        input: plan.inputPath,
        output: plan.outputPath,
        error: errorMessage,
        duration,
      });

      return { success: false, outputPath: plan.outputPath, duration, error: errorMessage };
    }
  }

  /**
   * Merge multiple PDF files into one using pdf-lib.
   */
  private async mergePdfs(inputFiles: string[], outputPath: string): Promise<ConversionResult> {
    const startTime = Date.now();

    const mergedPdf = await PDFDocument.create();

    for (const filePath of inputFiles) {
      const fileBytes = fs.readFileSync(filePath);
      const donorPdf = await PDFDocument.load(fileBytes);
      const indices = donorPdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(donorPdf, indices);
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, pdfBytes);

    const duration = Date.now() - startTime;
    logger.debug('PDF merge completed', { inputFiles, output: outputPath, duration });

    return {
      success: true,
      outputPath,
      duration,
      metadata: { format: 'pdf', mergedFiles: inputFiles.length },
    };
  }

  /**
   * Extract specific pages from a PDF using pdf-lib.
   * @param pages - Comma-separated page ranges, e.g. "1-3,5,7-9" (1-indexed)
   */
  private async splitPdf(inputPath: string, outputPath: string, pages?: string): Promise<ConversionResult> {
    const startTime = Date.now();

    const sourceBytes = fs.readFileSync(inputPath);
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const totalPages = sourcePdf.getPageCount();
    const indices = this.parsePageRanges(pages ?? '1', totalPages);

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    fs.writeFileSync(outputPath, pdfBytes);

    const duration = Date.now() - startTime;
    logger.debug('PDF split completed', { input: inputPath, output: outputPath, pages, duration });

    return {
      success: true,
      outputPath,
      duration,
      metadata: { format: 'pdf', pages: pages ?? '1' },
    };
  }

  /**
   * Basic PDF optimization: reload and re-save to let pdf-lib
   * remove orphaned objects and normalize the structure.
   * Note: This does NOT recompress raster images inside the PDF.
   */
  private async optimizePdf(inputPath: string, outputPath: string): Promise<ConversionResult> {
    const startTime = Date.now();

    const sourceBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(sourceBytes);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    const duration = Date.now() - startTime;
    logger.debug('PDF optimization completed', { input: inputPath, output: outputPath, duration });

    return {
      success: true,
      outputPath,
      duration,
      metadata: { format: 'pdf', preset: 'optimize' },
    };
  }

  /**
   * Parse page range strings like "1-3,5,7-9" into 0-based indices.
   */
  private parsePageRanges(rangeStr: string, totalPages: number): number[] {
    const indices: number[] = [];
    const parts = rangeStr.split(',').map(s => s.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(totalPages, parseInt(endStr, 10));
        for (let i = start; i <= end; i++) {
          indices.push(i - 1);
        }
      } else {
        const page = parseInt(part, 10);
        if (page >= 1 && page <= totalPages) {
          indices.push(page - 1);
        }
      }
    }

    return indices;
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);

    if (parameters.operation && !['compress', 'merge', 'split'].includes(parameters.operation)) {
      throw new Error('Invalid PDF operation. Supported operations: compress, merge, split');
    }

    if (parameters.operation === 'merge' && (!parameters.inputFiles || parameters.inputFiles.length < 2)) {
      throw new Error('Merge operation requires at least 2 input files');
    }
  }
}
