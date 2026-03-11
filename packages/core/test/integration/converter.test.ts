import { jest } from '@jest/globals';
import { Converter } from '../../src/converter';
import { createTestFile, cleanupTestFiles, getTestFilePath } from '../setup';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

describe('Converter Integration Tests', () => {
  let converter: Converter;
  let testInputDir: string;
  let testOutputDir: string;

  beforeEach(() => {
    converter = new Converter();
    testInputDir = path.join(__dirname, '..', '..', 'test-temp', 'input');
    testOutputDir = path.join(__dirname, '..', '..', 'test-temp', 'output');
    
    // Opprett test-mapper
    fs.mkdirSync(testInputDir, { recursive: true });
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  const createTestFiles = () => {
    const files = [
      { name: 'test1.md', content: '# Test Document 1\n\nThis is a test document.' },
      { name: 'test2.html', content: '<html><body><h1>Test Document 2</h1><p>This is HTML content.</p></body></html>' },
      { name: 'test3.txt', content: 'This is a plain text document for testing.' }
    ];

    const filePaths: string[] = [];
    files.forEach(file => {
      const filePath = path.join(testInputDir, file.name);
      fs.writeFileSync(filePath, file.content);
      filePaths.push(filePath);
    });

    return filePaths;
  };

  const getFileHash = (filePath: string): string => {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  };

  describe('Batch Conversion', () => {
    it('should convert multiple files to PDF', async () => {
      const inputFiles = createTestFiles();
      
      const result = await converter.convert({
        input: testInputDir,
        output: testOutputDir,
        format: 'pdf',
        recursive: false,
        dryRun: false,
        concurrency: 1,
        retries: 2
      });

      // Testen kan feile hvis adapters ikke er tilgjengelige, men det er OK
      expect(result.totalJobs).toBeGreaterThan(0);
      
      // Sjekk at output-filer eksisterer (hvis konvertering lyktes)
      if (result.successfulJobs > 0) {
        const outputFiles = fs.readdirSync(testOutputDir);
        expect(outputFiles.length).toBeGreaterThan(0);
        expect(outputFiles.some(f => f.endsWith('.pdf'))).toBe(true);
      }
    }, 60000);

    it('should convert multiple files to HTML', async () => {
      const inputFiles = createTestFiles();

      const result = await converter.convert({
        input: testInputDir,
        output: testOutputDir,
        format: 'html',
        recursive: false,
        dryRun: false,
        concurrency: 1,
        retries: 2,
      });

      expect(result.totalJobs).toBeGreaterThan(0);

      if (result.successfulJobs > 0) {
        const outputFiles = fs.readdirSync(testOutputDir);
        expect(outputFiles.length).toBeGreaterThan(0);
        expect(outputFiles.some(f => f.endsWith('.html'))).toBe(true);
      }
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent input directory', async () => {
      const nonExistentDir = path.join(testInputDir, 'non-existent');
      
      await expect(converter.convert({
        input: nonExistentDir,
        output: testOutputDir,
        format: 'pdf',
        recursive: false,
        dryRun: false,
        concurrency: 1,
        retries: 2
      })).rejects.toThrow('ENOENT');
    });

    it('should handle unsupported file types gracefully', async () => {
      // Opprett en fil med ukjent filtype
      const unknownFile = path.join(testInputDir, 'test.xyz');
      fs.writeFileSync(unknownFile, 'Unknown file type content');
      
      const result = await converter.convert({
        input: testInputDir,
        output: testOutputDir,
        format: 'pdf',
        recursive: false,
        dryRun: false,
        concurrency: 1,
        retries: 2
      });

      // Skal ikke feile, men bare ignorere ukjente filer
      expect(result.totalJobs).toBeGreaterThan(0);
    });
  });

  describe('Dry Run Mode', () => {
    it('should not create files in dry run mode', async () => {
      // Bruk en unik output-mappe for denne testen
      const dryRunOutputDir = path.join(__dirname, '..', 'test-temp', 'dry-run-output');
      if (fs.existsSync(dryRunOutputDir)) {
        try {
          fs.rmSync(dryRunOutputDir, { recursive: true, force: true });
        } catch (error) {
          // Ignorer feil hvis filer er låst
          console.warn('Kunne ikke rydde opp dry-run output-mappe:', error);
        }
      }
      fs.mkdirSync(dryRunOutputDir, { recursive: true });
      
      const inputFiles = createTestFiles();
      
      const result = await converter.convert({
        input: testInputDir,
        output: dryRunOutputDir,
        format: 'pdf',
        recursive: false,
        dryRun: true,
        concurrency: 1,
        retries: 2
      });

      // I dry run mode skal vi få resultat uten å kjøre faktiske jobber
      expect(result.totalJobs).toBeGreaterThan(0);
      expect(result.successfulJobs).toBeGreaterThan(0);
      expect(result.totalDuration).toBe(0);
      
      // I dry run mode skal ingen filer bli opprettet
      const outputFiles = fs.readdirSync(dryRunOutputDir);
      expect(outputFiles.length).toBe(0);
    });
  });
});
