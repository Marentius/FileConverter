/**
 * Strips control characters, ANSI escape sequences, and newlines from a string
 * to prevent log injection attacks (CWE-117).
 *
 * @param value - The raw string value to sanitize
 * @returns A sanitized string safe for log output
 */
export function sanitizeLogValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  const ANSI_ESCAPE = /\u001b\[[0-9;]*[a-zA-Z]/g;
  // eslint-disable-next-line no-control-regex
  const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

  return value
    .replace(ANSI_ESCAPE, '')
    .replace(CONTROL_CHARS, '')
    .replace(/[\n\r\t]/g, ' ');
}
