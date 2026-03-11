import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import logger from '../../logger';

/**
 * OCR adapter using tesseract.js (WebAssembly).
 * No external system dependencies required.
 *
 * Supports: image/PDF -> text extraction
 */
export class OcrAdapter extends BaseAdapter {
  readonly name = 'ocr';
  readonly supportedInputFormats = ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'webp'];
  readonly supportedOutputFormats = ['txt'];

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

      const language = parameters.language ?? 'eng';

      logger.debug('OCR adapter: Starting recognition', {
        input: plan.inputPath,
        output: plan.outputPath,
        language,
      });

      const worker = await Tesseract.createWorker(language);
      const { data } = await worker.recognize(plan.inputPath);
      await worker.terminate();

      fs.writeFileSync(plan.outputPath, data.text, 'utf-8');

      const duration = Date.now() - startTime;
      const outputSize = fs.statSync(plan.outputPath).size;

      logger.debug('OCR adapter: Recognition completed', {
        input: plan.inputPath,
        output: plan.outputPath,
        duration,
        characters: data.text.length,
      });

      return {
        success: true,
        outputPath: plan.outputPath,
        duration,
        metadata: {
          size: outputSize,
          format: 'txt',
          engine: 'tesseract.js',
          characters: data.text.length,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('OCR adapter: Recognition failed', {
        input: plan.inputPath,
        output: plan.outputPath,
        error: errorMessage,
        duration,
      });

      return { success: false, outputPath: plan.outputPath, duration, error: errorMessage };
    }
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);

    if (parameters.language && typeof parameters.language !== 'string') {
      throw new Error('language must be a string');
    }
  }
}
