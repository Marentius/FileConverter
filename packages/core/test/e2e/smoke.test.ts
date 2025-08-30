import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('E2E Smoke Tests', () => {
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');
  const testDir = path.join(__dirname, '..', '..', 'test-e2e');
  const outputDir = path.join(testDir, 'output');

  beforeAll(() => {
    // Opprett test-mapper
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    // Rydd opp etter tester
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
        timeout: 60000
      });
    } catch (error: any) {
      if (error.stdout) {
        return error.stdout;
      }
      throw error;
    }
  };

  describe('Representative Job 1: Document Conversion', () => {
    it('should convert markdown to PDF', () => {
      // Opprett test-fil
      createTestFile('smoke-test.md', '# Smoke Test\n\nThis is a smoke test document.');
      
      // Kjør konvertering
      const output = runCLI(['convert', '--in', 'smoke-test.md', '--out', 'output', '--to', 'pdf']);
      
      // Verifiser output
      expect(output).toContain('Vellykket');
      expect(fs.existsSync(path.join(outputDir, 'smoke-test.pdf'))).toBe(true);
      
      // Sjekk filstørrelse
      const stats = fs.statSync(path.join(outputDir, 'smoke-test.pdf'));
      expect(stats.size).toBeGreaterThan(1000);
    }, 60000);
  });

  describe('Representative Job 2: Batch Conversion', () => {
    it('should convert multiple files in batch', () => {
      // Opprett flere test-filer
      createTestFile('batch1.md', '# Batch Test 1\n\nFirst document.');
      createTestFile('batch2.html', '<html><body><h1>Batch Test 2</h1><p>Second document.</p></body></html>');
      createTestFile('batch3.txt', 'Third document - plain text.');
      
      // Kjør batch-konvertering
      const output = runCLI(['convert', '--in', '.', '--out', 'output', '--to', 'docx']);
      
      // Verifiser output
      expect(output).toContain('Vellykket');
      expect(output).toContain('3'); // Antall filer
      
      // Sjekk at alle output-filer eksisterer
      expect(fs.existsSync(path.join(outputDir, 'batch1.docx'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'batch2.docx'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'batch3.docx'))).toBe(true);
    }, 120000);
  });

  describe('Representative Job 3: CLI Commands', () => {
    it('should show supported formats', () => {
      const output = runCLI(['formats']);
      
      expect(output).toContain('STØTTEDE FILFORMATER');
      expect(output).toContain('png');
      expect(output).toContain('pdf');
      expect(output).toContain('docx');
    });

    it('should show available presets', () => {
      const output = runCLI(['presets']);
      
      expect(output).toContain('TILGJENGELIGE PRESETS');
      expect(output).toContain('image/web');
      expect(output).toContain('image/print');
    });

    it('should check tool availability', () => {
      const output = runCLI(['check-pandoc']);
      
      expect(output).toContain('PANDOC STATUS');
      expect(output).toContain('Pandoc funnet');
      expect(output).toContain('LaTeX funnet');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent input gracefully', () => {
      const output = runCLI(['convert', '--in', 'non-existent.md', '--out', 'output', '--to', 'pdf']);
      
      // Testen feiler fordi filen ikke eksisterer, men det er forventet oppførsel
      expect(output).toContain('ENOENT');
    });

    it('should handle unsupported format gracefully', () => {
      createTestFile('test.xyz', 'Unknown format content');
      
      const output = runCLI(['convert', '--in', 'test.xyz', '--out', 'output', '--to', 'pdf']);
      
      expect(output).toContain('Ikke-støttet');
    });
  });

  describe('Dry Run Mode', () => {
    it('should simulate conversion without creating files', () => {
      createTestFile('dry-run-test.md', '# Dry Run Test\n\nThis should not be converted.');
      
      const output = runCLI(['convert', '--in', 'dry-run-test.md', '--out', 'output', '--to', 'pdf', '--dry-run']);
      
      expect(output).toContain('DRY-RUN MODUS');
      expect(output).toContain('Ingen filer vil bli endret');
      
      // Verifiser at ingen filer ble opprettet
      expect(fs.existsSync(path.join(outputDir, 'dry-run-test.pdf'))).toBe(false);
    });
  });
});
