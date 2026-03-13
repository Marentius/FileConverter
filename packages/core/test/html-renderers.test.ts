import { stripHtml } from '../src/adapters/document/html-renderers';

describe('stripHtml', () => {
  it('removes basic HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('decodes basic HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
  });

  it('collapses excessive newlines', () => {
    expect(stripHtml('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips encoded script tags that decode to real tags (CWE-79, CodeQL alert #5)', () => {
    const malicious = '&lt;script&gt;alert("xss")&lt;/script&gt;';
    const result = stripHtml(malicious);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('</script');
  });

  it('handles double-encoded ampersands that produce dangerous entities (CodeQL alert #4)', () => {
    const doubleEncoded = '&amp;lt;script&amp;gt;alert("xss")&amp;lt;/script&amp;gt;';
    const result = stripHtml(doubleEncoded);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('</script');
  });

  it('handles nested encoded tags', () => {
    const nested = '&lt;img src=x onerror=alert(1)&gt;';
    const result = stripHtml(nested);
    expect(result).not.toContain('<img');
  });
});
