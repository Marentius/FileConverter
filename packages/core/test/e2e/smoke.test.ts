import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('E2E Smoke Tests', () => {
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');
  const testDir = path.join(__dirname, '..', '..', 'test-e2e');
  const outputDir = path.join(testDir, 'output');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const createTestFile = (filename: string, content: string): string => {
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  const runCLI = (args: string[]): string => {
    try {
      return execSync(`node "${cliPath}" ${args.join(' ')}`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 60000,
      });
    } catch (error: any) {
      if (error.stdout) {
        return error.stdout;
      }
      throw error;
    }
  };

  describe('Representative Job 1: Document Conversion', () => {
    it('should convert markdown to HTML', () => {
      createTestFile('smoke-test.md', '# Smoke Test\n\nThis is a smoke test document.');

      const output = runCLI(['convert', '--in', 'smoke-test.md', '--out', 'output', '--to', 'html']);

      const outputFile = path.join(outputDir, 'smoke-test.html');
      expect(fs.existsSync(outputFile)).toBe(true);

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('Smoke Test');
    }, 60000);
  });

  describe('Representative Job 2: Batch Conversion', () => {
    it('should convert multiple files in batch to HTML', () => {
      createTestFile('batch1.md', '# Batch Test 1\n\nFirst document.');
      createTestFile('batch2.txt', 'Third document - plain text.');

      const output = runCLI(['convert', '--in', '.', '--out', 'output', '--to', 'html']);

      expect(fs.existsSync(path.join(outputDir, 'batch1.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'batch2.html'))).toBe(true);
    }, 120000);
  });

  describe('Representative Job 3: CLI Commands', () => {
    it('should show supported formats', () => {
      const output = runCLI(['formats']);

      expect(output).toContain('SUPPORTED FILE FORMATS');
      expect(output).toContain('png');
      expect(output).toContain('pdf');
    });

    it('should show available presets', () => {
      const output = runCLI(['presets']);

      expect(output).toContain('AVAILABLE PRESETS');
      expect(output).toContain('image/web');
      expect(output).toContain('image/print');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent input gracefully', () => {
      const output = runCLI(['convert', '--in', 'non-existent.md', '--out', 'output', '--to', 'pdf']);

      expect(output).toContain('ENOENT');
    });

    it('should handle unsupported file types gracefully', () => {
      createTestFile('test.xyz', 'Unknown format content');

      const output = runCLI(['convert', '--in', 'test.xyz', '--out', 'output', '--to', 'pdf']);

      expect(output).toContain('Unsupported');
    });
  });

  describe('Dry Run Mode', () => {
    it('should simulate conversion without creating files', () => {
      createTestFile('dry-run-test.md', '# Dry Run Test\n\nThis should not be converted.');

      const output = runCLI(['convert', '--in', 'dry-run-test.md', '--out', 'output', '--to', 'pdf', '--dry-run']);

      expect(output).toContain('DRY-RUN MODE');
      expect(output).toContain('No files will be changed');
      expect(fs.existsSync(path.join(outputDir, 'dry-run-test.pdf'))).toBe(false);
    });
  });
});
