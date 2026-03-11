import path from 'path';

/**
 * Validates that a resolved file path is within the allowed base directory.
 * Prevents path traversal attacks (CWE-22).
 *
 * @param filePath - The file path to validate
 * @param baseDir - The allowed base directory
 * @returns The resolved, validated absolute path
 * @throws Error if the path escapes the base directory
 */
export function validatePath(filePath: string, baseDir: string): string {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);

  if (resolvedPath === resolvedBase) {
    return resolvedPath;
  }

  if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
    throw new Error(
      `Path '${filePath}' resolves outside allowed directory '${baseDir}'`
    );
  }

  return resolvedPath;
}

/**
 * Sanitizes a filename by stripping directory traversal sequences,
 * null bytes, and leading dots.
 *
 * @param filename - The raw filename to sanitize
 * @returns A safe filename with no path components
 */
export function sanitizeFilename(filename: string): string {
  let safe = filename.replace(/\0/g, '');

  safe = path.basename(safe.replace(/\\/g, '/'));

  safe = safe.replace(/^\.+/, '');

  return safe;
}
