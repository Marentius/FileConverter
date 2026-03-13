import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import officeparser from 'officeparser';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, ConversionParameters, ConversionResult } from '../base-adapter';
import { ConversionPlan } from '../../types';
import logger from '../../logger';
import {
  stripHtml,
  renderTextToPdf,
  renderHtmlToPdf,
  wrapInHtmlDocument,
  htmlToMarkdown,
} from '../document/html-renderers';

/**
 * Office document adapter using pure JavaScript libraries.
 * Converts DOCX, XLSX, PPTX, ODT, and RTF without external system programs.
 *
 * - mammoth: DOCX -> HTML (semantic, preserves headings/lists/tables/images)
 * - exceljs: XLSX -> HTML tables
 * - officeparser: PPTX/ODT/RTF -> plain text extraction
 */
export class OfficeAdapter extends BaseAdapter {
  readonly name = 'office';
  readonly supportedInputFormats = ['docx', 'xlsx', 'pptx', 'odt', 'rtf'];
  readonly supportedOutputFormats = ['pdf', 'html', 'txt', 'md'];

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      this.validateParameters(parameters);

      if (!fs.existsSync(plan.inputPath)) {
        throw new Error(`Input file not found: ${plan.inputPath}`);
      }
      this.validateInputFileSize(plan.inputPath);

      const outputDir = path.dirname(plan.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputFmt = plan.inputFormat.toLowerCase();
      const outputFmt = plan.outputFormat.toLowerCase();

      logger.debug('Office adapter: Starting conversion', {
        input: plan.inputPath,
        output: plan.outputPath,
        inputFormat: inputFmt,
        outputFormat: outputFmt,
      });

      if (outputFmt === 'pdf') {
        logger.warn(
          'PDF output uses basic text rendering. Formatting, images, and tables will not be preserved. For best results, convert to HTML instead.'
        );
      }

      const html = await this.readToHtml(plan.inputPath, inputFmt);
      await this.writeOutput(html, outputFmt, plan.outputPath);

      const duration = Date.now() - startTime;
      const outputSize = fs.existsSync(plan.outputPath) ? fs.statSync(plan.outputPath).size : 0;

      logger.debug('Office adapter: Conversion completed', {
        input: plan.inputPath,
        output: plan.outputPath,
        duration,
        outputSize,
      });

      return {
        success: true,
        outputPath: plan.outputPath,
        duration,
        metadata: { size: outputSize, format: outputFmt },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Office adapter: Conversion failed', {
        input: plan.inputPath,
        output: plan.outputPath,
        error: errorMessage,
        duration,
      });

      return { success: false, outputPath: plan.outputPath, duration, error: errorMessage };
    }
  }

  /**
   * Reads an office file and returns HTML content.
   * Uses format-specific parsers for best quality.
   * @param filePath - Path to the input file
   * @param format - Detected input format (docx, xlsx, pptx, odt, rtf)
   * @returns HTML string
   */
  private async readToHtml(filePath: string, format: string): Promise<string> {
    switch (format) {
      case 'docx':
        return this.readDocx(filePath);
      case 'xlsx':
        return this.readXlsx(filePath);
      case 'rtf':
        return this.readRtf(filePath);
      case 'pptx':
      case 'odt':
        return this.readWithOfficeParser(filePath);
      default:
        throw new Error(`Unsupported office input format: ${format}`);
    }
  }

  /**
   * Converts DOCX to semantic HTML using mammoth.
   * Preserves headings, lists, tables, bold/italic, and images.
   */
  private async readDocx(filePath: string): Promise<string> {
    const result = await mammoth.convertToHtml({ path: filePath });

    if (result.messages.length > 0) {
      logger.debug('Mammoth conversion messages', {
        messages: result.messages.map((m) => m.message),
      });
    }

    return result.value;
  }

  /**
   * Converts XLSX to an HTML table using exceljs.
   * Renders each worksheet as a separate table with headers.
   */
  private async readXlsx(filePath: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const htmlParts: string[] = [];

    workbook.eachSheet((worksheet) => {
      htmlParts.push(`<h2>${this.escapeHtml(worksheet.name)}</h2>`);
      htmlParts.push('<table border="1" cellpadding="4" cellspacing="0">');

      worksheet.eachRow((row, rowNumber) => {
        const tag = rowNumber === 1 ? 'th' : 'td';
        htmlParts.push('<tr>');
        row.eachCell({ includeEmpty: true }, (cell) => {
          const value = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
          htmlParts.push(`<${tag}>${this.escapeHtml(value)}</${tag}>`);
        });
        htmlParts.push('</tr>');
      });

      htmlParts.push('</table>');
    });

    return htmlParts.join('\n');
  }

  /**
   * Extracts text from an RTF file by stripping RTF control words.
   * Handles basic RTF structure including groups, control words, and unicode.
   */
  private async readRtf(filePath: string): Promise<string> {
    const rtfContent = fs.readFileSync(filePath, 'latin1');
    const text = this.stripRtf(rtfContent);
    const escaped = this.escapeHtml(text);
    const paragraphs = escaped
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n');

    return paragraphs;
  }

  /**
   * Strips RTF control sequences to extract plain text.
   */
  private stripRtf(rtf: string): string {
    let depth = 0;
    let inHeader = true;
    const output: string[] = [];
    let i = 0;

    while (i < rtf.length) {
      const ch = rtf[i];

      if (ch === '{') {
        depth++;
        i++;
        continue;
      }

      if (ch === '}') {
        depth--;
        if (depth <= 1) {
          inHeader = false;
        }
        i++;
        continue;
      }

      if (ch === '\\') {
        i++;
        if (i >= rtf.length) break;

        const next = rtf[i];

        if (next === '\'' && i + 2 < rtf.length) {
          const hex = rtf.substring(i + 1, i + 3);
          const code = parseInt(hex, 16);
          if (!isNaN(code)) {
            output.push(String.fromCharCode(code));
          }
          i += 3;
          continue;
        }

        if (next === '\\' || next === '{' || next === '}') {
          output.push(next);
          i++;
          continue;
        }

        let controlWord = '';
        while (i < rtf.length && /[a-zA-Z]/.test(rtf[i])) {
          controlWord += rtf[i];
          i++;
        }

        while (i < rtf.length && /[0-9-]/.test(rtf[i])) {
          i++;
        }

        if (i < rtf.length && rtf[i] === ' ') {
          i++;
        }

        if (controlWord === 'par' || controlWord === 'line') {
          output.push('\n');
        } else if (controlWord === 'tab') {
          output.push('\t');
        }

        continue;
      }

      if (!inHeader && depth >= 1) {
        output.push(ch);
      }

      i++;
    }

    return output.join('').trim();
  }

  /**
   * Extracts text from PPTX or ODT using officeparser.
   * Returns text wrapped in HTML paragraph tags.
   */
  private async readWithOfficeParser(filePath: string): Promise<string> {
    const text = await officeparser.parseOfficeAsync(filePath);
    const escaped = this.escapeHtml(text);
    const paragraphs = escaped
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n');

    return paragraphs;
  }

  /**
   * Writes HTML content to the target format.
   * @param html - HTML content (fragment, not full document)
   * @param outputFormat - Target format (pdf, html, txt, md)
   * @param outputPath - Destination file path
   */
  private async writeOutput(html: string, outputFormat: string, outputPath: string): Promise<void> {
    switch (outputFormat) {
      case 'pdf':
        await renderHtmlToPdf(html, outputPath);
        break;
      case 'html':
      case 'htm':
        fs.writeFileSync(outputPath, wrapInHtmlDocument(html), 'utf-8');
        break;
      case 'txt':
        fs.writeFileSync(outputPath, stripHtml(html), 'utf-8');
        break;
      case 'md':
      case 'markdown':
        fs.writeFileSync(outputPath, htmlToMarkdown(html), 'utf-8');
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
