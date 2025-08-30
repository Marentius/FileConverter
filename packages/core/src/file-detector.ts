import { fileTypeFromFile } from 'file-type';
import path from 'path';
import { FileTypeInfo } from './types';
import logger from './logger';

// Støttede filformater basert på kravspesifikasjonen
const SUPPORTED_FORMATS = {
  // Bildeformater
  'image/heic': { ext: 'heic', supported: true },
  'image/jpeg': { ext: 'jpg', supported: true },
  'image/png': { ext: 'png', supported: true },
  'image/webp': { ext: 'webp', supported: true },
  'image/tiff': { ext: 'tiff', supported: true },
  'image/bmp': { ext: 'bmp', supported: true },
  'image/gif': { ext: 'gif', supported: true },
  
  // Dokumentformater (støttes for konvertering)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', supported: true },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', supported: true },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', supported: true },
  'application/pdf': { ext: 'pdf', supported: true },
  'text/markdown': { ext: 'md', supported: true }, // Støttes av Pandoc
  'text/html': { ext: 'html', supported: true }, // Støttes av Pandoc
  'text/rtf': { ext: 'rtf', supported: true }, // Støttes av Pandoc
  'application/rtf': { ext: 'rtf', supported: true }, // Støttes av Pandoc
  'text/plain': { ext: 'txt', supported: true }, // Støttes av Pandoc
  
  // Video/lyd (valgfri)
  'video/mp4': { ext: 'mp4', supported: true },
  'video/quicktime': { ext: 'mov', supported: true },
  'audio/mpeg': { ext: 'mp3', supported: true },
  'audio/wav': { ext: 'wav', supported: true }
};

// Extension til MIME mapping for fallback
const EXTENSION_TO_MIME: Record<string, string> = {
  'heic': 'image/heic',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  'bmp': 'image/bmp',
  'gif': 'image/gif',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'pdf': 'application/pdf',
  'md': 'text/markdown',
  'html': 'text/html',
  'htm': 'text/html',
  'rtf': 'application/rtf',
  'txt': 'text/plain',
  'mp4': 'video/mp4',
  'mov': 'video/quicktime',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav'
};

export async function detectFileType(filePath: string): Promise<FileTypeInfo> {
  try {
    // Først prøv file-type (MIME/signatur basert)
    const fileType = await fileTypeFromFile(filePath);
    
    if (fileType) {
      const mime = fileType.mime;
      const formatInfo = SUPPORTED_FORMATS[mime as keyof typeof SUPPORTED_FORMATS];
      
      if (formatInfo) {
        logger.debug(`Filtype oppdaget via MIME: ${mime} (${formatInfo.ext})`, { filePath });
        return {
          ext: formatInfo.ext,
          mime,
          supported: formatInfo.supported
        };
      } else {
        logger.warn(`Ikke-støttet MIME-type: ${mime}`, { filePath });
        return {
          ext: fileType.ext || 'unknown',
          mime,
          supported: false
        };
      }
    }
  } catch (error) {
    logger.debug(`Kunne ikke oppdage filtype via MIME, prøver extension`, { filePath, error });
  }
  
  // Fallback til extension-basert deteksjon
  const extension = path.extname(filePath).toLowerCase().slice(1);
  const mime = EXTENSION_TO_MIME[extension];
  
  if (mime) {
    const formatInfo = SUPPORTED_FORMATS[mime as keyof typeof SUPPORTED_FORMATS];
    if (formatInfo) {
      logger.debug(`Filtype oppdaget via extension: ${extension} (${mime})`, { filePath });
      return {
        ext: formatInfo.ext,
        mime,
        supported: formatInfo.supported
      };
    }
  }
  
  logger.warn(`Ikke-støttet filtype: ${extension}`, { filePath });
  return {
    ext: extension || 'unknown',
    mime: 'unknown',
    supported: false
  };
}

export function isSupportedFormat(format: string): boolean {
  return Object.values(SUPPORTED_FORMATS).some(info => info.ext === format.toLowerCase());
}

export function getSupportedFormats(): string[] {
  return Object.values(SUPPORTED_FORMATS)
    .filter(info => info.supported)
    .map(info => info.ext);
}
