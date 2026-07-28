import { DocumentAdapter } from '../../src/adapters/document/document-adapter';
import { createTestFile, cleanupTestFiles, getTestFilePath } from '../setup';
import fs from 'fs';

describe('DocumentAdapter', () => {
  let adapter: DocumentAdapter;
  let testInputPath: string;
  let testOutputPath: string;

  beforeEach(() => {
    adapter = new DocumentAdapter();
    testInputPath = createTestFile('doc-test.md', '# Test Document\n\nThis is a test.');
    testOutputPath = getTestFilePath('doc-test-output.html');
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  describe('canHandle', () => {
    it('should support markdown to HTML conversion', () => {
      expect(adapter.canHandle('md', 'html')).toBe(true);
    });

    it('should support markdown to PDF conversion', () => {
      expect(adapter.canHandle('md', 'pdf')).toBe(true);
    });

    it('should support HTML to markdown conversion', () => {
      expect(adapter.canHandle('html', 'md')).toBe(true);
    });

    it('should support HTML to text conversion', () => {
      expect(adapter.canHandle('html', 'txt')).toBe(true);
    });

    it('should not support unsupported conversions', () => {
      expect(adapter.canHandle('xyz', 'abc')).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert markdown to HTML', async () => {
      const plan = {
        inputPath: testInputPath,
        outputPath: testOutputPath,
        inputFormat: 'md',
        outputFormat: 'html',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.existsSync(testOutputPath)).toBe(true);

      const content = fs.readFileSync(testOutputPath, 'utf-8');
      expect(content).toContain('<h1>');
      expect(content).toContain('Test Document');
    });

    it('should convert markdown to PDF', async () => {
      const pdfOutputPath = getTestFilePath('doc-test-output.pdf');
      const plan = {
        inputPath: testInputPath,
        outputPath: pdfOutputPath,
        inputFormat: 'md',
        outputFormat: 'pdf',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.existsSync(pdfOutputPath)).toBe(true);
      expect(fs.statSync(pdfOutputPath).size).toBeGreaterThan(0);
    });

    it('should convert HTML to markdown', async () => {
      const htmlInput = createTestFile(
        'doc-test.html',
        '<html><body><h1>Hello</h1><p>World</p></body></html>'
      );
      const mdOutput = getTestFilePath('doc-test-output.md');
      const plan = {
        inputPath: htmlInput,
        outputPath: mdOutput,
        inputFormat: 'html',
        outputFormat: 'md',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      const content = fs.readFileSync(mdOutput, 'utf-8');
      expect(content).toContain('Hello');
      expect(content).toContain('World');
    });

    it('should convert HTML to text', async () => {
      const htmlInput = createTestFile(
        'doc-test2.html',
        '<html><body><h1>Title</h1><p>Paragraph text</p></body></html>'
      );
      const txtOutput = getTestFilePath('doc-test-output.txt');
      const plan = {
        inputPath: htmlInput,
        outputPath: txtOutput,
        inputFormat: 'html',
        outputFormat: 'txt',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      const content = fs.readFileSync(txtOutput, 'utf-8');
      expect(content).toContain('Title');
      expect(content).toContain('Paragraph text');
    });

    it('should convert HTML to PDF', async () => {
      const htmlInput = createTestFile('doc-test-pdf.html', '<h1>HTML Title</h1><p>PDF body text</p>');
      const pdfOutput = getTestFilePath('doc-test-html-output.pdf');
      const plan = {
        inputPath: htmlInput,
        outputPath: pdfOutput,
        inputFormat: 'html',
        outputFormat: 'pdf',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.readFileSync(pdfOutput).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('should convert plain text to PDF', async () => {
      const textInput = createTestFile('doc-test-pdf.txt', 'Plain text PDF body');
      const pdfOutput = getTestFilePath('doc-test-text-output.pdf');
      const plan = {
        inputPath: textInput,
        outputPath: pdfOutput,
        inputFormat: 'txt',
        outputFormat: 'pdf',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.readFileSync(pdfOutput).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('should escape plain text when converting to HTML', async () => {
      const textInput = createTestFile('doc-test.txt', 'A < B & C');
      const htmlOutput = getTestFilePath('doc-test-text-output.html');
      const plan = {
        inputPath: textInput,
        outputPath: htmlOutput,
        inputFormat: 'txt',
        outputFormat: 'html',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.readFileSync(htmlOutput, 'utf-8')).toContain('<pre>A &lt; B &amp; C</pre>');
    });

    it('should remove markdown syntax when converting to text', async () => {
      const markdownInput = createTestFile('doc-test-text.md', '# Heading\n\n**Bold** content');
      const textOutput = getTestFilePath('doc-test-markdown-output.txt');
      const plan = {
        inputPath: markdownInput,
        outputPath: textOutput,
        inputFormat: 'md',
        outputFormat: 'txt',
        supported: true,
      };

      const result = await adapter.convert(plan, {});
      const content = fs.readFileSync(textOutput, 'utf-8');

      expect(result.success).toBe(true);
      expect(content).toContain('Heading');
      expect(content).toContain('Bold content');
      expect(content).not.toContain('#');
      expect(content).not.toContain('**');
    });

    it('should preserve plain text when converting to markdown', async () => {
      const textInput = createTestFile('doc-test-markdown.txt', 'Plain text remains unchanged.');
      const markdownOutput = getTestFilePath('doc-test-text-output.md');
      const plan = {
        inputPath: textInput,
        outputPath: markdownOutput,
        inputFormat: 'txt',
        outputFormat: 'md',
        supported: true,
      };

      const result = await adapter.convert(plan, {});

      expect(result.success).toBe(true);
      expect(fs.readFileSync(markdownOutput, 'utf-8')).toBe('Plain text remains unchanged.');
    });
    it('should handle conversion errors gracefully for missing input', async () => {
      const nonExistentFile = getTestFilePath('non-existent.md');
      const plan = {
        inputPath: nonExistentFile,
        outputPath: testOutputPath,
        inputFormat: 'md',
        outputFormat: 'html',
        supported: true,
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
    });

    it('should return supported output formats', () => {
      expect(adapter.supportedOutputFormats).toContain('pdf');
      expect(adapter.supportedOutputFormats).toContain('html');
      expect(adapter.supportedOutputFormats).toContain('md');
      expect(adapter.supportedOutputFormats).toContain('txt');
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
