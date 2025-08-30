import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import { LibreOfficeDetector } from '../../utils/libreoffice-detector';
import logger from '../../logger';

const execAsync = promisify(exec);

export class LibreOfficeAdapter extends BaseAdapter {
  readonly name = 'libreoffice';
  readonly supportedInputFormats = ['docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls', 'odt', 'odp', 'ods', 'pdf'];
  readonly supportedOutputFormats = ['pdf', 'docx'];

  private detector: LibreOfficeDetector;

  constructor() {
    super();
    this.detector = LibreOfficeDetector.getInstance();
  }

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      
      logger.debug(`LibreOffice adapter: Starter konvertering`, {
        input: plan.inputPath,
        output: plan.outputPath,
        parameters
      });

      // Sjekk om LibreOffice er tilgjengelig
      const libreOfficeInfo = await this.detector.detectLibreOffice();
      if (!libreOfficeInfo.found) {
        throw new Error(libreOfficeInfo.error || 'LibreOffice ikke funnet');
      }

      // Opprett output-mappe hvis den ikke eksisterer
      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Opprett midlertidig mappe for LibreOffice
      const tmpDir = await this.createTempDir();
      
      try {
        // Konverter med LibreOffice
        await this.convertWithLibreOffice(plan.inputPath, tmpDir, libreOfficeInfo.path!);
        
        // Finn den konverterte filen
        const convertedFile = await this.findConvertedFile(plan.inputPath, tmpDir);
        if (!convertedFile) {
          throw new Error('Konvertert fil ikke funnet');
        }

        // Flytt til ønsket plassering (atomisk)
        await this.moveFileAtomically(convertedFile, plan.outputPath);

        const fileStats = fs.statSync(plan.outputPath);
        const duration = Date.now() - startTime;

        logger.debug(`LibreOffice adapter: Konvertering fullført`, {
          input: plan.inputPath,
          output: plan.outputPath,
          duration,
          outputSize: fileStats.size
        });

        return {
          success: true,
          outputPath: plan.outputPath,
          duration,
          metadata: {
            size: fileStats.size,
            format: 'pdf'
          }
        };

      } finally {
        // Rydd opp midlertidig mappe
        await this.cleanupTempDir(tmpDir);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`LibreOffice adapter: Konvertering feilet`, {
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

  private async createTempDir(): Promise<string> {
    const tmpDir = path.join(os.tmpdir(), `fileconverter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }

  private async convertWithLibreOffice(inputPath: string, outputDir: string, sofficePath: string): Promise<void> {
    const command = `"${sofficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    
    logger.debug('Kjører LibreOffice kommando', { command });
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 sekunder timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    if (stderr && !stderr.includes('convert')) {
      logger.warn('LibreOffice stderr', { stderr });
    }

    logger.debug('LibreOffice stdout', { stdout });
  }

  private async findConvertedFile(inputPath: string, outputDir: string): Promise<string | null> {
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const expectedPdfPath = path.join(outputDir, `${inputBasename}.pdf`);
    
    // Vent litt for at filen skal bli skrevet
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(expectedPdfPath)) {
        return expectedPdfPath;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Hvis ikke funnet, søk etter PDF-filer
    const files = fs.readdirSync(outputDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 1) {
      return path.join(outputDir, pdfFiles[0]);
    }
    
    return null;
  }

  private async moveFileAtomically(sourcePath: string, targetPath: string): Promise<void> {
    // På Windows, bruk rename for atomisk flytting
    if (os.platform() === 'win32') {
      fs.renameSync(sourcePath, targetPath);
    } else {
      // På Unix-systemer, bruk rename for atomisk flytting
      fs.renameSync(sourcePath, targetPath);
    }
  }

  private async cleanupTempDir(tmpDir: string): Promise<void> {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn('Kunne ikke rydde opp midlertidig mappe', { tmpDir, error });
    }
  }

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);
    
    // LibreOffice-spesifikke valideringer kan legges til her
  }

  async checkAvailability(): Promise<boolean> {
    const info = await this.detector.detectLibreOffice();
    return info.found;
  }
}
