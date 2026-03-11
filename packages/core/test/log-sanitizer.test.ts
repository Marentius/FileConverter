import { sanitizeLogValue } from '../src/log-sanitizer';

describe('log-sanitizer', () => {
  describe('sanitizeLogValue', () => {
    it('should return a normal string unchanged', () => {
      expect(sanitizeLogValue('/home/user/file.png')).toBe('/home/user/file.png');
    });

    it('should strip newline characters', () => {
      expect(sanitizeLogValue('file\ninjected-line')).toBe('file injected-line');
    });

    it('should strip carriage return characters', () => {
      expect(sanitizeLogValue('file\rinjected')).toBe('file injected');
    });

    it('should strip tab characters', () => {
      expect(sanitizeLogValue('file\tname')).toBe('file name');
    });

    it('should strip ANSI escape sequences', () => {
      expect(sanitizeLogValue('\x1b[31mred text\x1b[0m')).toBe('red text');
    });

    it('should strip null bytes', () => {
      expect(sanitizeLogValue('file\x00.png')).toBe('file.png');
    });

    it('should strip other control characters', () => {
      expect(sanitizeLogValue('abc\x07\x08def')).toBe('abcdef');
    });

    it('should handle an empty string', () => {
      expect(sanitizeLogValue('')).toBe('');
    });

    it('should preserve unicode characters', () => {
      expect(sanitizeLogValue('fïlé-næm.txt')).toBe('fïlé-næm.txt');
    });

    it('should handle Windows-style paths', () => {
      expect(sanitizeLogValue('C:\\Users\\name\\file.png')).toBe('C:\\Users\\name\\file.png');
    });
  });
});
