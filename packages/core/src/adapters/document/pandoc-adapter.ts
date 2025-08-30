import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import { PandocDetector } from '../../utils/pandoc-detector';
import logger from '../../logger';

const execAsync = promisify(exec);

export class PandocAdapter extends BaseAdapter {
  readonly name = 'pandoc';
  readonly supportedInputFormats = ['md', 'markdown', 'html', 'htm', 'rtf', 'txt'];
  readonly supportedOutputFormats = ['pdf', 'docx', 'html', 'rtf', 'txt'];

  private detector: PandocDetector;

  constructor() {
    super();
    this.detector = PandocDetector.getInstance();
  }

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      

      logger.debug(`Pandoc adapter: Starting conversion`, {
        input: plan.inputPath,
        output: plan.outputPath,
        parameters
      });

      // Check if Pandoc is available
      const pandocTools = await this.detector.detectPandocTools();
      if (!pandocTools.pandoc.found) {
        throw new Error(pandocTools.pandoc.error || 'Pandoc not found');
      }

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Delete existing output file if it exists to avoid permission denied errors
      if (fs.existsSync(plan.outputPath)) {
        try {
          fs.unlinkSync(plan.outputPath);
        } catch (error) {
          logger.warn(`Could not delete existing output file: ${plan.outputPath}`, { error });
        }
      }

      // Get original file size
      const originalSize = fs.statSync(plan.inputPath).size;

      let result: ConversionResult;

      // Determine conversion method based on input/output formats
      if (plan.outputFormat === 'pdf') {
        result = await this.convertToPdf(plan.inputPath, plan.outputPath, pandocTools);
      } else {
        result = await this.convertToOther(plan.inputPath, plan.outputPath, plan.outputFormat, pandocTools);
      }

      // Add original size to metadata
      if (result.success && result.metadata) {
        result.metadata.originalSize = originalSize;
        if (fs.existsSync(plan.outputPath)) {
          result.metadata.size = fs.statSync(plan.outputPath).size;
        }
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Pandoc adapter: Conversion failed`, {
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

  private async convertToPdf(
    inputPath: string, 
    outputPath: string, 
    pandocTools: any
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      const pandocPath = pandocTools.pandoc.path!;
      const hasLaTeX = pandocTools.latex.found;

      // Build Pandoc command for PDF
      const args = [
        inputPath,
        '-o', outputPath
      ];

      // Add LaTeX-specific settings if available
      if (hasLaTeX) {
        args.push('--pdf-engine=pdflatex');
        logger.debug('Using LaTeX for high-quality PDF');
      } else {
        // Try to use standard PDF engine (printer) or give a clear error message
        logger.warn('LaTeX not available, trying standard PDF engine');
        // Do not specify --pdf-engine, let Pandoc choose the standard
      }

      const command = `"${pandocPath}" ${args.join(' ')}`;
      
      logger.debug('Running Pandoc PDF command', { 
        command,
        pandocPath,
        args,
        workingDir: process.cwd()
      });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('Output written')) {
        logger.warn('Pandoc stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`Pandoc PDF conversion finished`, {
        input: inputPath,
        output: outputPath,
        duration,
        outputSize,
        hasLaTeX
      });

      return {
        success: true,
        outputPath,
        duration,
        metadata: {
          size: outputSize,
          format: 'pdf',
          engine: hasLaTeX ? 'pdflatex' : 'standard'
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Pandoc PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async convertToOther(
    inputPath: string, 
    outputPath: string, 
    outputFormat: string,
    pandocTools: any
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      const pandocPath = pandocTools.pandoc.path!;

      // Build Pandoc command for other formats
      const args = [
        inputPath,
        '-o', outputPath
      ];

      // Add format-specific settings
      if (outputFormat === 'docx') {
        // Do not use --reference-doc if we don't have a template
        logger.debug('Converting to DOCX without template');
      } else if (outputFormat === 'html') {
        args.push('--standalone'); // Generate complete HTML
        // Do not use --css if we don't have a CSS file
      }

      const command = `"${pandocPath}" ${args.join(' ')}`;
      
      logger.debug('Running Pandoc conversion', { 
        command,
        pandocPath,
        args,
        workingDir: process.cwd()
      });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('Output written')) {
        logger.warn('Pandoc stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`Pandoc conversion finished`, {
        input: inputPath,
        output: outputPath,
        outputFormat,
        duration,
        outputSize
      });

      return {
        success: true,
        outputPath,
        duration,
        metadata: {
          size: outputSize,
          format: outputFormat
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Pandoc conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);
    
    // Pandoc-specific validations can be added here
  }

  async checkAvailability(): Promise<boolean> {
    const info = await this.detector.detectPandocTools();
    return info.pandoc.found;
  }
}
