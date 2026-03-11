import { jest } from '@jest/globals';
import { PandocAdapter } from '../../src/adapters/document/pandoc-adapter';
import { createTestFile, cleanupTestFiles, getTestFilePath } from '../setup';
import { execSync } from 'child_process';
import fs from 'fs';

function isPandocAvailable(): boolean {
  try {
    execSync('pandoc --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const pandocAvailable = isPandocAvailable();

describe('PandocAdapter', () => {
  let adapter: PandocAdapter;
  let testInputPath: string;
  let testOutputPath: string;

  beforeEach(() => {
    adapter = new PandocAdapter();
    testInputPath = createTestFile('pandoc-test.md', '# Test Document\n\nThis is a test.');
    testOutputPath = getTestFilePath('pandoc-test-output.pdf');
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  describe('canHandle', () => {
    it('should support markdown to PDF conversion', () => {
      const result = adapter.canHandle('md', 'pdf');
      expect(result).toBe(true);
    });

    it('should support HTML to DOCX conversion', () => {
      const result = adapter.canHandle('html', 'docx');
      expect(result).toBe(true);
    });

    it('should not support unsupported conversions', () => {
      const result = adapter.canHandle('xyz', 'abc');
      expect(result).toBe(false);
    });
  });

  describe('convert', () => {
    const itIfPandoc = pandocAvailable ? it : it.skip;

    itIfPandoc('should convert markdown to PDF', async () => {
      const plan = {
        inputPath: testInputPath,
        outputPath: testOutputPath,
        inputFormat: 'md',
        outputFormat: 'pdf',
        supported: true
      };

      const result = await adapter.convert(plan, {});

      if (!result.success) {
        console.error('Pandoc conversion failed:', result.error);
      }

      expect(result.success).toBe(true);
      expect(fs.existsSync(testOutputPath)).toBe(true);
      expect(fs.statSync(testOutputPath).size).toBeGreaterThan(0);
    }, 30000);

    itIfPandoc('should convert markdown to DOCX', async () => {
      const docxOutputPath = getTestFilePath('pandoc-test-output.docx');
      const plan = {
        inputPath: testInputPath,
        outputPath: docxOutputPath,
        inputFormat: 'md',
        outputFormat: 'docx',
        supported: true
      };
      
      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.existsSync(docxOutputPath)).toBe(true);
      expect(fs.statSync(docxOutputPath).size).toBeGreaterThan(0);
    }, 30000);

    itIfPandoc('should handle conversion errors gracefully', async () => {
      const nonExistentFile = getTestFilePath('pandoc-non-existent.md');
      const plan = {
        inputPath: nonExistentFile,
        outputPath: testOutputPath,
        inputFormat: 'md',
        outputFormat: 'pdf',
        supported: true
      };
      
      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('supportedFormats', () => {
    it('should return supported input formats', () => {
      expect(adapter.supportedInputFormats).toContain('md');
      expect(adapter.supportedInputFormats).toContain('html');
      expect(adapter.supportedInputFormats).toContain('txt');
      expect(adapter.supportedInputFormats).toContain('rtf');
    });

    it('should return supported output formats', () => {
      expect(adapter.supportedOutputFormats).toContain('pdf');
      expect(adapter.supportedOutputFormats).toContain('docx');
    });
  });

  describe('validateParameters', () => {
    it('should validate quality parameter', () => {
      expect(() => adapter.validateParameters({ quality: 50 })).not.toThrow();
      expect(() => adapter.validateParameters({ quality: 0 })).toThrow();
      expect(() => adapter.validateParameters({ quality: 101 })).toThrow();
    });

    it('should validate maxWidth parameter', () => {
      expect(() => adapter.validateParameters({ maxWidth: 100 })).not.toThrow();
      expect(() => adapter.validateParameters({ maxWidth: 0 })).toThrow();
      expect(() => adapter.validateParameters({ maxWidth: -1 })).toThrow();
    });
  });
});
