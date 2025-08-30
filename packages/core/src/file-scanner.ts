import path from 'path';
import fs from 'fs';
import { detectFileType } from './file-detector';
import { ConversionPlan } from './types';
import logger from './logger';

export async function scanForFiles(
  inputPath: string,
  outputDir: string,
  targetFormat: string,
  recursive: boolean = false
): Promise<ConversionPlan[]> {
  const plans: ConversionPlan[] = [];
  
  try {
    // Sjekk om input er en fil eller mappe
    const stats = fs.statSync(inputPath);
    
    if (stats.isFile()) {
      // Enkelt fil
      const plan = await createConversionPlan(inputPath, outputDir, targetFormat);
      plans.push(plan);
    } else if (stats.isDirectory()) {
      // Mappe - finn alle filer
      const files: string[] = [];
      
      if (recursive) {
        // Rekursiv søk - forenklet implementasjon for nå
        logger.warn('Rekursiv søk ikke fullt implementert ennå');
      } else {
        // Ikke-rekursiv søk
        const items = fs.readdirSync(inputPath);
        for (const item of items) {
          const fullPath = path.join(inputPath, item);
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            files.push(fullPath);
          }
        }
      }
      
      logger.info(`Fant ${files.length} filer i mappen: ${files.join(', ')}`);
      
      for (const file of files) {
        const plan = await createConversionPlan(file, outputDir, targetFormat);
        plans.push(plan);
      }
    } else {
      throw new Error(`Input path er verken fil eller mappe: ${inputPath}`);
    }
    
  } catch (error) {
    logger.error(`Feil ved skanning av input path: ${inputPath}`, { error });
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
  
  // Generer output filnavn
  const inputBasename = path.basename(inputPath, path.extname(inputPath));
  const outputFilename = `${inputBasename}.${targetFormat}`;
  const outputPath = path.join(outputDir, outputFilename);
  
  // Sjekk om konverteringen er støttet
  const supported = fileType.supported && isSupportedFormat(targetFormat);
  let reason: string | undefined;
  
  if (!fileType.supported) {
    reason = `Input format '${inputFormat}' er ikke støttet`;
  } else if (!isSupportedFormat(targetFormat)) {
    reason = `Output format '${targetFormat}' er ikke støttet`;
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
    // Bildeformater
    'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'heic',
    // Dokumentformater
    'docx', 'pptx', 'xlsx', 'pdf', 'md', 'html', 'rtf', 'txt',
    // Video/lyd
    'mp4', 'mov', 'mp3', 'wav'
  ];
  
  return supportedFormats.includes(format.toLowerCase());
}
