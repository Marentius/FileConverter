import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateFileSize, DEFAULT_MAX_FILE_SIZE } from '../src/file-size-guard';

describe('file-size-guard', () => {
  const tempDir = path.join(os.tmpdir(), 'fileconverter-size-test');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should accept a file smaller than the limit', () => {
    const filePath = path.join(tempDir, 'small.txt');
    fs.writeFileSync(filePath, 'hello');

    expect(() => validateFileSize(filePath)).not.toThrow();
  });

  it('should accept a file exactly at the custom limit', () => {
    const filePath = path.join(tempDir, 'exact.txt');
    const content = Buffer.alloc(100);
    fs.writeFileSync(filePath, content);

    expect(() => validateFileSize(filePath, 100)).not.toThrow();
  });

  it('should throw when file exceeds the custom limit', () => {
    const filePath = path.join(tempDir, 'big.txt');
    const content = Buffer.alloc(200);
    fs.writeFileSync(filePath, content);

    expect(() => validateFileSize(filePath, 100))
      .toThrow(/exceeds maximum allowed size/);
  });

  it('should throw when file does not exist', () => {
    const filePath = path.join(tempDir, 'nonexistent.txt');

    expect(() => validateFileSize(filePath)).toThrow();
  });

  it('should export a sensible default max file size', () => {
    expect(DEFAULT_MAX_FILE_SIZE).toBeGreaterThan(0);
    expect(DEFAULT_MAX_FILE_SIZE).toBeLessThanOrEqual(2 * 1024 * 1024 * 1024);
  });
});
