import path from 'path';
import { validatePath, sanitizeFilename } from '../src/path-security';

describe('path-security', () => {
  describe('validatePath', () => {
    it('should accept a path within the base directory', () => {
      const base = '/home/user/output';
      const filePath = '/home/user/output/file.png';

      expect(() => validatePath(filePath, base)).not.toThrow();
    });

    it('should accept a path equal to the base directory', () => {
      const base = '/home/user/output';

      expect(() => validatePath(base, base)).not.toThrow();
    });

    it('should reject a path that traverses above the base directory', () => {
      const base = '/home/user/output';
      const filePath = '/home/user/output/../../etc/passwd';

      expect(() => validatePath(filePath, base)).toThrow(/outside allowed directory/);
    });

    it('should reject an absolute path outside the base directory', () => {
      const base = '/home/user/output';
      const filePath = '/etc/shadow';

      expect(() => validatePath(filePath, base)).toThrow(/outside allowed directory/);
    });

    it('should reject paths using dot-dot sequences', () => {
      const base = '/home/user/output';
      const filePath = '/home/user/output/../secret/data';

      expect(() => validatePath(filePath, base)).toThrow(/outside allowed directory/);
    });

    it('should accept nested subdirectories within base', () => {
      const base = '/home/user/output';
      const filePath = '/home/user/output/sub/deep/file.jpg';

      expect(() => validatePath(filePath, base)).not.toThrow();
    });

    it('should reject a sibling directory that starts with the same prefix', () => {
      const base = '/home/user/output';
      const filePath = '/home/user/output-evil/file.png';

      expect(() => validatePath(filePath, base)).toThrow(/outside allowed directory/);
    });

    it('should resolve relative paths before checking', () => {
      const base = path.resolve('test-output');
      const filePath = path.join('test-output', 'file.png');

      expect(() => validatePath(filePath, base)).not.toThrow();
    });
  });

  describe('sanitizeFilename', () => {
    it('should return a normal filename unchanged', () => {
      expect(sanitizeFilename('photo.png')).toBe('photo.png');
    });

    it('should strip directory traversal from filename', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    });

    it('should strip leading dots that could hide files', () => {
      expect(sanitizeFilename('.hidden')).toBe('hidden');
    });

    it('should replace null bytes', () => {
      expect(sanitizeFilename('file\x00.png')).toBe('file.png');
    });

    it('should handle filenames with path separators', () => {
      const result = sanitizeFilename('sub/dir/file.txt');
      expect(result).toBe('file.txt');
    });

    it('should handle Windows-style path separators', () => {
      const result = sanitizeFilename('sub\\dir\\file.txt');
      expect(result).toBe('file.txt');
    });
  });
});
