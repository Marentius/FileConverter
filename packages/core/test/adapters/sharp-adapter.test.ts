import { jest } from '@jest/globals';
import { SharpAdapter } from '../../src/adapters/images/sharp-adapter';
import { createTestFile, cleanupTestFiles, getTestFilePath } from '../setup';
import path from 'path';
import fs from 'fs';

describe('SharpAdapter', () => {
  let adapter: SharpAdapter;
  let testInputPath: string;
  let testOutputPath: string;

  beforeEach(() => {
    adapter = new SharpAdapter();
    // Opprett en enkel test-bildefil (1x1 pixel PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    testInputPath = getTestFilePath('sharp-test.png');
    fs.writeFileSync(testInputPath, pngBuffer);
    testOutputPath = getTestFilePath('sharp-test-output.jpg');
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
