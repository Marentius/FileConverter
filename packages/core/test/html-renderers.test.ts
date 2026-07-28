import fs from 'fs';
import sharp from 'sharp';
import { getTestFilePath } from './setup';
import { renderHtmlToPdf, stripHtml } from '../src/adapters/document/html-renderers';

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
});
