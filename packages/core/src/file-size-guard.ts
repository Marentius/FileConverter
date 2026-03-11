import fs from 'fs';
import path from 'path';

/** 500 MB — reasonable limit for a file conversion tool */
export const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Validates that a file does not exceed the maximum allowed size.
 * Prevents resource exhaustion from processing extremely large files (CWE-770).
 *
 * @param filePath - Path to the file to check
 * @param maxSize - Maximum allowed size in bytes (defaults to 500 MB)
 * @throws Error if the file exceeds the size limit or does not exist
 */
export function validateFileSize(
  filePath: string,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): void {
  const stats = fs.statSync(filePath);
  if (stats.size > maxSize) {
    const fileMB = (stats.size / (1024 * 1024)).toFixed(1);
    const limitMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File '${path.basename(filePath)}' (${fileMB} MB) exceeds maximum allowed size (${limitMB} MB)`
    );
  }
}
