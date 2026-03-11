/**
 * Strips control characters, ANSI escape sequences, and newlines from a string
 * to prevent log injection attacks (CWE-117).
 *
 * @param value - The raw string value to sanitize
 * @returns A sanitized string safe for log output
 */
export function sanitizeLogValue(value: string): string {
  return value
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/[\n\r\t]/g, ' ');
}
