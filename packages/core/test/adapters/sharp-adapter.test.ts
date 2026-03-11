import { jest } from '@jest/globals';
import { SharpAdapter } from '../../src/adapters/images/sharp-adapter';
import { cleanupTestFiles, getTestFilePath } from '../setup';
import sharp from 'sharp';
import fs from 'fs';

describe('SharpAdapter', () => {
  let adapter: SharpAdapter;
  let testInputPath: string;
  let testOutputPath: string;

  beforeEach(async () => {
    adapter = new SharpAdapter();
    testInputPath = getTestFilePath('sharp-test.png');
    testOutputPath = getTestFilePath('sharp-test-output.jpg');

    await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toFile(testInputPath);
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  describe('canHandle', () => {
    it('should support PNG to JPG conversion', () => {
      const result = adapter.canHandle('png', 'jpg');
      expect(result).toBe(true);
    });

    it('should support JPG to WEBP conversion', () => {
      const result = adapter.canHandle('jpg', 'webp');
      expect(result).toBe(true);
    });

    it('should not support unsupported conversions', () => {
      const result = adapter.canHandle('xyz', 'abc');
      expect(result).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert PNG to JPG', async () => {
      const plan = {
        inputPath: testInputPath,
        outputPath: testOutputPath,
        inputFormat: 'png',
        outputFormat: 'jpg',
        supported: true
      };

      const result = await adapter.convert(plan, { quality: 85 });

      expect(result.success).toBe(true);
      expect(fs.existsSync(testOutputPath)).toBe(true);
      expect(fs.statSync(testOutputPath).size).toBeGreaterThan(0);
    }, 30000);

    it('should apply quality settings', async () => {
      const plan = {
        inputPath: testInputPath,
        outputPath: testOutputPath,
        inputFormat: 'png',
        outputFormat: 'jpg',
        supported: true
      };

      const result = await adapter.convert(plan, { quality: 50 });

      expect(result.success).toBe(true);
      expect(fs.existsSync(testOutputPath)).toBe(true);
    }, 30000);

    it('should handle conversion errors gracefully', async () => {
      const nonExistentFile = getTestFilePath('sharp-non-existent.png');
      const plan = {
        inputPath: nonExistentFile,
        outputPath: testOutputPath,
        inputFormat: 'png',
        outputFormat: 'jpg',
        supported: true
      };
      
      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('supportedFormats', () => {
    it('should return supported input formats', () => {
      expect(adapter.supportedInputFormats).toContain('png');
      expect(adapter.supportedInputFormats).toContain('jpg');
      expect(adapter.supportedInputFormats).toContain('webp');
    });

    it('should return supported output formats', () => {
      expect(adapter.supportedOutputFormats).toContain('png');
      expect(adapter.supportedOutputFormats).toContain('jpg');
      expect(adapter.supportedOutputFormats).toContain('webp');
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
