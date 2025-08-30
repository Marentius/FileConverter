import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import { PdfToolsDetector } from '../../utils/pdf-tools-detector';
import { getPdfPreset, getDefaultPdfPreset } from '../../presets/pdf-presets';
import logger from '../../logger';

const execAsync = promisify(exec);

export interface PdfOperation {
  type: 'compress' | 'merge' | 'split';
  inputFiles: string[];
  outputFile: string;
  preset?: string;
  pages?: string; // For split operations: "1-3,5,7-9"
}

export class PdfAdapter extends BaseAdapter {
  readonly name = 'pdf';
  readonly supportedInputFormats = ['pdf'];
  readonly supportedOutputFormats = ['pdf'];

  private detector: PdfToolsDetector;

  constructor() {
    super();
    this.detector = PdfToolsDetector.getInstance();
  }

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      
      logger.debug(`PDF adapter: Starting conversion`, {
        input: plan.inputPath,
        output: plan.outputPath,
        parameters
      });

      // Sjekk om PDF-verktøy er tilgjengelige
      const pdfTools = await this.detector.detectPdfTools();
      
      // Opprett output-mappe hvis den ikke eksisterer
      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Hent original filstørrelse
      const originalSize = fs.statSync(plan.inputPath).size;

      let result: ConversionResult;

      // Bestem operasjon basert på parametere
      if (parameters.operation === 'compress') {
        result = await this.compressPdf(plan.inputPath, plan.outputPath, parameters.preset, pdfTools);
      } else if (parameters.operation === 'merge') {
        result = await this.mergePdfs(parameters.inputFiles || [plan.inputPath], plan.outputPath, pdfTools);
      } else if (parameters.operation === 'split') {
        result = await this.splitPdf(plan.inputPath, plan.outputPath, parameters.pages, pdfTools);
      } else {
        throw new Error('Ukjent PDF-operasjon. Støttede operasjoner: compress, merge, split');
      }

      // Legg til original størrelse i metadata
      if (result.success && result.metadata) {
        result.metadata.originalSize = originalSize;
        if (fs.existsSync(plan.outputPath)) {
          result.metadata.size = fs.statSync(plan.outputPath).size;
          result.metadata.compressionRatio = originalSize > 0 ? 
            ((originalSize - result.metadata.size) / originalSize * 100).toFixed(1) + '%' : '0%';
        }
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`PDF adapter: Conversion failed`, {
        input: plan.inputPath,
        output: plan.outputPath,
        error: errorMessage,
        duration
      });

      return {
        success: false,
        outputPath: plan.outputPath,
        duration,
        error: errorMessage
      };
    }
  }

  private async compressPdf(
    inputPath: string, 
    outputPath: string, 
    presetName?: string, 
    pdfTools?: any
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      if (!pdfTools?.ghostscript.found) {
        throw new Error(pdfTools?.ghostscript.error || 'Ghostscript not found');
      }

      const preset = presetName ? getPdfPreset(presetName) : getDefaultPdfPreset();
      if (!preset) {
        throw new Error(`Unknown preset: ${presetName}`);
      }

      const gsPath = pdfTools.ghostscript.path!;
      const settings = preset.ghostscriptSettings;

      // Bygg Ghostscript-kommando
      const args = [
        '-sDEVICE=pdfwrite',
        '-dPDFSETTINGS=' + settings.dPDFSETTINGS,
        '-dCompatibilityLevel=' + settings.dCompatibilityLevel,
        '-dAutoFilterColorImages=' + (settings.dAutoFilterColorImages ? 'true' : 'false'),
        '-dAutoFilterGrayImages=' + (settings.dAutoFilterGrayImages ? 'true' : 'false'),
        '-dColorImageFilter=' + settings.dColorImageFilter,
        '-dGrayImageFilter=' + settings.dGrayImageFilter,
        '-dMonoImageFilter=' + settings.dMonoImageFilter,
        '-dDownsampleColorImages=' + (settings.dDownsampleColorImages ? 'true' : 'false'),
        '-dDownsampleGrayImages=' + (settings.dDownsampleGrayImages ? 'true' : 'false'),
        '-dDownsampleMonoImages=' + (settings.dDownsampleMonoImages ? 'true' : 'false'),
        '-dColorImageResolution=' + settings.dColorImageResolution,
        '-dGrayImageResolution=' + settings.dGrayImageResolution,
        '-dMonoImageResolution=' + settings.dMonoImageResolution,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-sOutputFile=' + outputPath,
        inputPath
      ];

      const command = `"${gsPath}" ${args.join(' ')}`;
      
      logger.debug('Running Ghostscript command', { command });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('Processing pages')) {
        logger.warn('Ghostscript stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`PDF compression completed`, {
        input: inputPath,
        output: outputPath,
        preset: preset.name,
        duration,
        outputSize
      });

      return {
        success: true,
        outputPath,
        duration,
        metadata: {
          size: outputSize,
          format: 'pdf',
          preset: preset.name
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`PDF compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async mergePdfs(
    inputFiles: string[], 
    outputPath: string, 
    pdfTools?: any
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      if (!pdfTools?.qpdf.found) {
        throw new Error(pdfTools?.qpdf.error || 'qpdf not found');
      }

      const qpdfPath = pdfTools.qpdf.path!;

      // qpdf --empty --pages file1.pdf file2.pdf file3.pdf -- merged.pdf
      const args = [
        '--empty',
        '--pages',
        ...inputFiles,
        '--',
        outputPath
      ];

      const command = `"${qpdfPath}" ${args.join(' ')}`;
      
      logger.debug('Running qpdf merge command', { command });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('written')) {
        logger.warn('qpdf stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`PDF merge completed`, {
        inputFiles,
        output: outputPath,
        duration,
        outputSize
      });

      return {
        success: true,
        outputPath,
        duration,
        metadata: {
          size: outputSize,
          format: 'pdf',
          mergedFiles: inputFiles.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`PDF merge failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async splitPdf(
    inputPath: string, 
    outputPath: string, 
    pages?: string, 
    pdfTools?: any
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      if (!pdfTools?.qpdf.found) {
        throw new Error(pdfTools?.qpdf.error || 'qpdf not found');
      }

      const qpdfPath = pdfTools.qpdf.path!;

      // qpdf input.pdf --pages . 1-3,5 -- output.pdf
      const args = [
        inputPath,
        '--pages',
        '.',
        pages || '1',
        '--',
        outputPath
      ];

      const command = `"${qpdfPath}" ${args.join(' ')}`;
      
      logger.debug('Running qpdf split command', { command });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('written')) {
        logger.warn('qpdf stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`PDF split completed`, {
        input: inputPath,
        output: outputPath,
        pages,
        duration,
        outputSize
      });

      return {
        success: true,
        outputPath,
        duration,
        metadata: {
          size: outputSize,
          format: 'pdf',
          pages: pages || '1'
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`PDF split failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);
    
    if (parameters.operation && !['compress', 'merge', 'split'].includes(parameters.operation)) {
      throw new Error('Invalid PDF operation. Supported operations: compress, merge, split');
    }

    if (parameters.operation === 'merge' && (!parameters.inputFiles || parameters.inputFiles.length < 2)) {
      throw new Error('Merge operation requires at least 2 input files');
    }

    if (parameters.preset && !getPdfPreset(parameters.preset)) {
      throw new Error(`Unknown PDF preset: ${parameters.preset}`);
    }
  }

  async checkAvailability(): Promise<boolean> {
    const info = await this.detector.detectPdfTools();
    return info.ghostscript.found || info.qpdf.found;
  }
}
