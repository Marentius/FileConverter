import { marked } from 'marked';
import PDFDocument from 'pdfkit';
import TurndownService from 'turndown';
import fs from 'fs';

/**
 * Strips HTML tags and decodes basic entities to produce plain text.
 * @param html - Raw HTML string
 * @returns Plain text content
 */
export function stripHtml(html: string): string {
  const text = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<\/?[a-zA-Z!][^>]*>/g, '')
    .replace(/&amp;/g, '&');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Converts Markdown to plain text by rendering to HTML then stripping tags.
 * @param md - Markdown source
 * @returns Plain text content
 */
export function stripMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return stripHtml(html);
}

/**
 * Renders plain text content to a PDF file using pdfkit.
 * @param textContent - Plain text to render
 * @param outputPath - Destination file path
 * @returns Promise that resolves when the PDF is written
 */
export function renderTextToPdf(textContent: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);
    doc.fontSize(12).text(textContent, { lineGap: 4 });
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Wraps HTML content in a full HTML document structure.
 * @param bodyHtml - HTML fragment to wrap
 * @returns Complete HTML document string
 */
export function wrapInHtmlDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${bodyHtml}\n</body>\n</html>`;
}

/**
 * Converts HTML to Markdown using Turndown.
 * @param html - HTML content to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService();
  return turndown.turndown(html);
}

/**
 * Renders HTML content to a PDF by stripping tags and using pdfkit.
 * @param html - HTML content
 * @param outputPath - Destination file path
 * @returns Promise that resolves when the PDF is written
 */
export function renderHtmlToPdf(html: string, outputPath: string): Promise<void> {
  const textContent = stripHtml(html);
  return renderTextToPdf(textContent, outputPath);
}
