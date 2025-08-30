import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import { OcrDetector } from '../../utils/ocr-detector';
import logger from '../../logger';

const execAsync = promisify(exec);

export class OcrAdapter extends BaseAdapter {
  readonly name = 'ocr';
  readonly supportedInputFormats = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'];
  readonly supportedOutputFormats = ['pdf', 'txt'];

  private detector: OcrDetector;

  constructor() {
    super();
    this.detector = OcrDetector.getInstance();
  }

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      
      logger.debug(`OCR adapter: Starting conversion`, {
        input: plan.inputPath,
        output: plan.outputPath,
        parameters
      });

      // Sjekk om OCR-verktøy er tilgjengelig
      const ocrTools = await this.detector.detectOcrTools();
      if (!ocrTools.ocrmypdf.found && !ocrTools.tesseract.found) {
        throw new Error('Ingen OCR-verktøy funnet. Installer ocrmypdf eller Tesseract.');
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
      if (plan.inputFormat === 'pdf' && plan.outputFormat === 'pdf') {
        // PDF → søkbar PDF med ocrmypdf
        result = await this.convertPdfToSearchablePdf(plan.inputPath, plan.outputPath, ocrTools, parameters);
      } else if (plan.outputFormat === 'txt') {
        // Bilde/PDF → tekst med Tesseract
        result = await this.convertToText(plan.inputPath, plan.outputPath, ocrTools, parameters);
      } else {
        throw new Error(`Ikke støttet konvertering: ${plan.inputFormat} → ${plan.outputFormat}`);
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
      
      logger.error(`OCR adapter: Konvertering feilet`, {
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

  private async convertPdfToSearchablePdf(
    inputPath: string, 
    outputPath: string, 
    ocrTools: any,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      if (!ocrTools.ocrmypdf.found) {
        throw new Error('ocrmypdf ikke tilgjengelig for PDF → PDF konvertering');
      }

      const ocrmypdfPath = ocrTools.ocrmypdf.path!;
      
      // Bygg ocrmypdf-kommando
      const args = [
        '--output-type', 'pdf',
        '--force-ocr'
      ];

      // Legg til språk hvis spesifisert
      if (parameters.language) {
        args.push('--language', parameters.language);
      }

      // Legg til kvalitetsinnstillinger
      if (parameters.quality) {
        switch (parameters.quality) {
          case 'fast':
            args.push('--fast');
            break;
          case 'standard':
            // Standard innstillinger
            break;
          case 'high':
            args.push('--skip-text');
            args.push('--deskew');
            args.push('--clean');
            break;
        }
      }

      // Legg til input og output
      args.push(inputPath, outputPath);

      const command = `"${ocrmypdfPath}" ${args.join(' ')}`;
      
      logger.debug('Kjører ocrmypdf kommando', { command });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutter timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stderr && !stderr.includes('Output written')) {
        logger.warn('ocrmypdf stderr', { stderr });
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

      logger.debug(`OCR PDF-konvertering fullført`, {
        input: inputPath,
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
          engine: 'ocrmypdf',
          searchable: true
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`OCR PDF-konvertering feilet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async convertToText(
    inputPath: string, 
    outputPath: string, 
    ocrTools: any,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      if (!ocrTools.tesseract.found) {
        throw new Error('Tesseract ikke tilgjengelig for tekst-ekstrahering');
      }

      const tesseractPath = ocrTools.tesseract.path!;
      
      // Bygg Tesseract-kommando
      const args = [
        inputPath,
        path.basename(outputPath, path.extname(outputPath)) // Tesseract legger til .txt automatisk
      ];

      // Legg til språk hvis spesifisert
      if (parameters.language) {
        args.push('-l', parameters.language);
      }

      // Legg til kvalitetsinnstillinger
      if (parameters.quality) {
        switch (parameters.quality) {
          case 'fast':
            args.push('--oem', '1'); // LSTM OCR Engine Mode
            break;
          case 'standard':
            args.push('--oem', '3'); // Default
            break;
          case 'high':
            args.push('--oem', '3');
            args.push('--psm', '6'); // Uniform block of text
            break;
        }
      }

      const command = `"${tesseractPath}" ${args.join(' ')}`;
      
      logger.debug('Kjører Tesseract kommando', { command });
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000, // 2 minutter timeout
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer
      });

      if (stderr && !stderr.includes('Tesseract Open Source OCR Engine')) {
        logger.warn('Tesseract stderr', { stderr });
      }

      // Tesseract legger til .txt automatisk, så vi må finne den faktiske filen
      const actualOutputPath = outputPath.endsWith('.txt') ? outputPath : outputPath + '.txt';
      
      if (!fs.existsSync(actualOutputPath)) {
        throw new Error('Tesseract output-fil ikke funnet');
      }

      const duration = Date.now() - startTime;
      const outputSize = fs.statSync(actualOutputPath).size;

      logger.debug(`OCR tekst-ekstrahering fullført`, {
        input: inputPath,
        output: actualOutputPath,
        duration,
        outputSize
      });

      return {
        success: true,
        outputPath: actualOutputPath,
        duration,
        metadata: {
          size: outputSize,
          format: 'txt',
          engine: 'tesseract',
          characters: outputSize // Grov estimat av antall tegn
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`OCR tekst-ekstrahering feilet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);
    
    // OCR-spesifikke valideringer
    if (parameters.language && typeof parameters.language !== 'string') {
      throw new Error('language må være en streng');
    }
    
    if (parameters.quality && typeof parameters.quality === 'string' && !['fast', 'standard', 'high'].includes(parameters.quality)) {
      throw new Error('quality må være fast, standard eller high');
    }
  }

  async checkAvailability(): Promise<boolean> {
    const info = await this.detector.detectOcrTools();
    return info.ocrmypdf.found || info.tesseract.found;
  }
}
