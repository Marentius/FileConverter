import path from 'path';
import fs from 'fs';
import { detectFileType } from './file-detector';
import { ConversionPlan } from './types';
import { validatePath, sanitizeFilename } from './path-security';
import { sanitizeLogValue } from './log-sanitizer';
import logger from './logger';

export async function scanForFiles(
  inputPath: string,
  outputDir: string,
  targetFormat: string,
  recursive: boolean = false
): Promise<ConversionPlan[]> {
  const plans: ConversionPlan[] = [];
  
  try {
    // Check if input is a file or directory
    const stats = fs.statSync(inputPath);
    
    if (stats.isFile()) {
      // Single file
      const plan = await createConversionPlan(inputPath, outputDir, targetFormat);
      plans.push(plan);
    } else if (stats.isDirectory()) {
      // Directory - find all files
      const files: string[] = [];
      
      if (recursive) {
        // Recursive search - simplified implementation for now
        logger.warn('Recursive search not fully implemented yet');
      } else {
        // Non-recursive search
        const items = fs.readdirSync(inputPath);
        for (const item of items) {
          const fullPath = path.join(inputPath, item);
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            files.push(fullPath);
          }
        }
      }
      
      logger.info('Found files in directory', {
        count: files.length,
        directory: sanitizeLogValue(inputPath),
      });
      
      for (const file of files) {
        const plan = await createConversionPlan(file, outputDir, targetFormat);
        plans.push(plan);
      }
    } else {
      throw new Error(`Input path is neither file nor directory: ${inputPath}`);
    }
    
  } catch (error) {
    logger.error(`Error scanning input path: ${inputPath}`, { error });
    throw error;
  }
  
  return plans;
}

async function createConversionPlan(
  inputPath: string,
  outputDir: string,
  targetFormat: string
): Promise<ConversionPlan> {
  const fileType = await detectFileType(inputPath);
  const inputFormat = fileType.ext;
  
  const inputBasename = sanitizeFilename(
    path.basename(inputPath, path.extname(inputPath))
  );
  const outputFilename = `${inputBasename}.${targetFormat}`;
  const outputPath = path.join(outputDir, outputFilename);

  validatePath(outputPath, outputDir);
  
  // Check if conversion is supported
  const supported = fileType.supported && isSupportedFormat(targetFormat);
  let reason: string | undefined;
  
  if (!fileType.supported) {
    reason = `Input format '${inputFormat}' is not supported`;
  } else if (!isSupportedFormat(targetFormat)) {
    reason = `Output format '${targetFormat}' is not supported`;
  }
  
  return {
    inputPath,
    outputPath,
    inputFormat,
    outputFormat: targetFormat,
    supported,
    reason
  };
}

function isSupportedFormat(format: string): boolean {
  const supportedFormats = [
    // Image formats
    'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'heic',
    // Document formats
    'docx', 'pptx', 'xlsx', 'pdf', 'md', 'html', 'rtf', 'txt',
    // Video/audio
    'mp4', 'mov', 'mp3', 'wav'
  ];
  
  return supportedFormats.includes(format.toLowerCase());
}
