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
      
      logger.debug(`Pandoc adapter: Starter konvertering`, {
        input: plan.inputPath,
        output: plan.outputPath,
        parameters
      });

      // Sjekk om Pandoc er tilgjengelig
      const pandocTools = await this.detector.detectPandocTools();
      if (!pandocTools.pandoc.found) {
        throw new Error(pandocTools.pandoc.error || 'Pandoc ikke funnet');
      }

      // Opprett output-mappe hvis den ikke eksisterer
      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Hent original filstørrelse
      const originalSize = fs.statSync(plan.inputPath).size;

      let result: ConversionResult;

      // Bestem konverteringsmetode basert på input/output formater
      if (plan.outputFormat === 'pdf') {
        result = await this.convertToPdf(plan.inputPath, plan.outputPath, pandocTools);
      } else {
        result = await this.convertToOther(plan.inputPath, plan.outputPath, plan.outputFormat, pandocTools);
      }

      // Legg til original størrelse i metadata
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
      
      logger.error(`Pandoc adapter: Konvertering feilet`, {
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

      // Bygg Pandoc-kommando for PDF
      const args = [
        inputPath,
        '-o', outputPath
      ];

      // Legg til LaTeX-spesifikke innstillinger hvis tilgjengelig
      if (hasLaTeX) {
        args.push('--pdf-engine=pdflatex');
        logger.debug('Bruker LaTeX for høy kvalitet PDF');
      } else {
        // Prøv å bruke standard PDF-motor (printer) eller gi tydelig feilmelding
        logger.warn('LaTeX ikke tilgjengelig, prøver standard PDF-motor');
        // Ikke spesifiser --pdf-engine, la Pandoc velge standard
      }

      const command = `"${pandocPath}" ${args.join(' ')}`;
      
      logger.debug('Kjører Pandoc PDF-kommando', { 
        command,
        pandocPath,
        args,
        workingDir: process.cwd()
      });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000, // 2 minutter timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('Output written')) {
        logger.warn('Pandoc stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`Pandoc PDF-konvertering fullført`, {
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
      throw new Error(`Pandoc PDF-konvertering feilet: ${error instanceof Error ? error.message : String(error)}`);
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

      // Bygg Pandoc-kommando for andre formater
      const args = [
        inputPath,
        '-o', outputPath
      ];

      // Legg til formater-spesifikke innstillinger
      if (outputFormat === 'docx') {
        // Ikke bruk --reference-doc hvis vi ikke har en mal
        logger.debug('Konverterer til DOCX uten referansemal');
      } else if (outputFormat === 'html') {
        args.push('--standalone'); // Generer komplett HTML
        // Ikke bruk --css hvis vi ikke har en CSS-fil
      }

      const command = `"${pandocPath}" ${args.join(' ')}`;
      
      logger.debug('Kjører Pandoc konvertering', { 
        command,
        pandocPath,
        args,
        workingDir: process.cwd()
      });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 sekunder timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('Output written')) {
        logger.warn('Pandoc stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`Pandoc konvertering fullført`, {
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
      throw new Error(`Pandoc konvertering feilet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);
    
    // Pandoc-spesifikke valideringer kan legges til her
  }

  async checkAvailability(): Promise<boolean> {
    const info = await this.detector.detectPandocTools();
    return info.pandoc.found;
  }
}
