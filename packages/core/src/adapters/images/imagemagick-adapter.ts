import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import logger from '../../logger';

export class ImageMagickAdapter extends BaseAdapter {
  readonly name = 'imagemagick';
  readonly supportedInputFormats = ['heic', 'jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp', 'gif'];
  readonly supportedOutputFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp', 'gif'];

  private getImageMagickPath(): string {
    // Common ImageMagick installation paths on Windows
    const possiblePaths = [
      'magick',
      'C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe',
      'C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe',
      'C:\\Program Files\\ImageMagick-7.1.0-Q16-HDRI\\magick.exe',
      'C:\\Program Files\\ImageMagick-7.0.11-Q16-HDRI\\magick.exe',
    ];

    for (const magickPath of possiblePaths) {
      try {
        if (magickPath === 'magick') {
          // Check if magick is in PATH
          require('child_process').execSync('magick -version', { stdio: 'ignore' });
          return magickPath;
        } else if (fs.existsSync(magickPath)) {
          return magickPath;
        }
      } catch {
        continue;
      }
    }

    throw new Error('ImageMagick not found. Please install ImageMagick from https://imagemagick.org/');
  }

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      
      logger.debug(`ImageMagick adapter: Starting conversion`, {
        input: plan.inputPath,
        output: plan.outputPath,
        parameters
      });

      // Opprett output-mappe hvis den ikke eksisterer
      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const magickPath = this.getImageMagickPath();
      
      // Build ImageMagick command arguments
      const args: string[] = [];
      
      // Input file
      args.push(plan.inputPath);
      
      // Quality setting
      if (parameters.quality && typeof parameters.quality === 'number') {
        args.push('-quality', parameters.quality.toString());
      }
      
      // Resize if specified
      if (parameters.maxWidth || parameters.maxHeight) {
        const resizeArg = [];
        if (parameters.maxWidth) resizeArg.push(parameters.maxWidth.toString());
        if (parameters.maxHeight) resizeArg.push(parameters.maxHeight.toString());
        args.push('-resize', resizeArg.join('x'));
      }
      
      // Output file
      args.push(plan.outputPath);

      logger.debug(`ImageMagick command: ${magickPath} ${args.join(' ')}`);

      // Execute ImageMagick
      const result = await new Promise<{ success: boolean; stdout: string; stderr: string }>((resolve) => {
        const process = spawn(magickPath, args);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        process.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        process.on('close', (code) => {
          resolve({
            success: code === 0,
            stdout,
            stderr
          });
        });
        
        process.on('error', (error) => {
          resolve({
            success: false,
            stdout: '',
            stderr: error.message
          });
        });
      });

      if (!result.success) {
        throw new Error(`ImageMagick failed: ${result.stderr}`);
      }

      // Verify output file exists
      if (!fs.existsSync(plan.outputPath)) {
        throw new Error('Output file was not created');
      }

      // Get file stats
      const fileStats = fs.statSync(plan.outputPath);
      const duration = Date.now() - startTime;

      logger.debug(`ImageMagick adapter: Conversion finished`, {
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
          format: plan.outputFormat
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`ImageMagick adapter: Conversion failed`, {
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

  validateParameters(parameters: ConversionParameters): void {
    super.validateParameters(parameters);
    
    // ImageMagick-spesifikke valideringer
    if (parameters.quality !== undefined && parameters.quality !== null) {
      if (typeof parameters.quality !== 'number') {
        throw new Error('Quality must be a number for image conversion');
      }
      if (parameters.quality < 1 || parameters.quality > 100) {
        throw new Error('Quality must be between 1 and 100');
      }
    }
  }
}
