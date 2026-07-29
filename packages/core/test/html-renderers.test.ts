import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { getTestFilePath } from './setup';
import { renderHtmlToPdf, stripHtml } from '../src/adapters/document/html-renderers';

async function extractPdfText(outputPath: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(outputPath)) }).promise;
  const pages = await Promise.all(Array.from({ length: document.numPages }, async (_, index) => {
    const content = await (await document.getPage(index + 1)).getTextContent();
    return content.items.map((item) => ('str' in item ? item.str : '')).join('');
  }));
  return pages.join('\n');
}

describe('stripHtml', () => {
  it('removes basic HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('removes nested HTML tags', () => {
    expect(stripHtml('<div><p>Hello <strong>world</strong></p></div>')).toBe('Hello world');
  });

  it('decodes &amp; entities to &', () => {
    expect(stripHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
  });

  it('decodes &quot; and &#39; entities', () => {
    expect(stripHtml('&quot;hello&quot; &#39;world&#39;')).toBe('"hello" \'world\'');
  });

  it('collapses excessive newlines', () => {
    expect(stripHtml('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips script tags and their content', () => {
    const result = stripHtml('<script>alert("xss")</script>safe');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toBe('safe');
  });

  it('prevents encoded script tags from becoming real tags (CWE-79)', () => {
    const malicious = '&lt;script&gt;alert("xss")&lt;/script&gt;';
    const result = stripHtml(malicious);
    expect(result).not.toContain('<script');
  });

  it('prevents double-encoded payloads from producing dangerous tags (CWE-79)', () => {
    const doubleEncoded = '&amp;lt;script&amp;gt;alert("xss")&amp;lt;/script&amp;gt;';
    const result = stripHtml(doubleEncoded);
    expect(result).not.toContain('<script');
  });

  it('prevents encoded img/event handler injection', () => {
    const nested = '&lt;img src=x onerror=alert(1)&gt;';
    const result = stripHtml(nested);
    expect(result).not.toContain('<img');
  });

  it('strips style tags and their content', () => {
    const result = stripHtml('<style>body{color:red}</style>text');
    expect(result).not.toContain('<style');
    expect(result).toBe('text');
  });
  it('renders semantic structure and embedded images instead of a text-only PDF', async () => {
    const outputPath = getTestFilePath('structured-html-output.pdf');
    const image = (await sharp({ create: { width: 20, height: 20, channels: 3, background: '#0a84ff' } }).png().toBuffer()).toString('base64');

    await renderHtmlToPdf(
      `<h1>Structured Heading</h1><p><strong>Bold</strong> and <em>italic</em> text.</p><ul><li>First item</li><li>Second item</li></ul><table><tr><th>Key</th><th>Value</th></tr><tr><td>Table</td><td>Value</td></tr></table><img src="data:image/png;base64,${image}">`,
      outputPath
    );

    const pdf = fs.readFileSync(outputPath);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.includes(Buffer.from('/Subtype /Image'))).toBe(true);
    expect(pdf.length).toBeGreaterThan(2_000);
  });

  it('uses the bold-oblique font for nested strong and emphasis tags', async () => {
    const outputPath = getTestFilePath('nested-inline-styles.pdf');

    await renderHtmlToPdf('<p><strong><em>Bold italic</em></strong></p>', outputPath);

    expect(fs.readFileSync(outputPath).includes(Buffer.from('Helvetica-BoldOblique'))).toBe(true);
  });

  it('measures table cells using the table font size after a heading', async () => {
    const outputPath = getTestFilePath('table-font-size.pdf');
    const originalHeightOfString = PDFDocument.prototype.heightOfString;
    const fontSizes: number[] = [];

    PDFDocument.prototype.heightOfString = function (...args) {
      fontSizes.push((this as PDFDocument & { _fontSize: number })._fontSize);
      return originalHeightOfString.apply(this, args as [string, PDFKit.Mixins.TextOptions]);
    };

    try {
      await renderHtmlToPdf('<h1>Heading</h1><table><tr><td>Cell</td></tr></table>', outputPath);
    } finally {
      PDFDocument.prototype.heightOfString = originalHeightOfString;
    }

    expect(fontSizes).toEqual([10]);
  });

  it('rejects when the output file cannot be created', async () => {
    const outputPath = path.join(getTestFilePath('missing-output-directory'), 'output.pdf');

    await expect(renderHtmlToPdf('<p>Content</p>', outputPath)).rejects.toThrow();
  });

  it('does not render content from unsupported tags', async () => {
    const outputPath = getTestFilePath('unsupported-html-output.pdf');

    await renderHtmlToPdf('<p>Visible content</p><script>SECRET_SCRIPT</script><style>SECRET_STYLE</style>', outputPath);

    const text = await extractPdfText(outputPath);
    expect(text).toContain('Visible content');
    expect(text).not.toContain('SECRET_SCRIPT');
    expect(text).not.toContain('SECRET_STYLE');
  });
});
