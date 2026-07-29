import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

describe('Office conversion E2E tests', () => {
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');
  const testDir = path.join(__dirname, '..', '..', 'test-e2e-office');
  const outputDir = path.join(testDir, 'output');

  beforeAll(() => {
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function runCli(input: string, format: string): void {
    execFileSync('node', [cliPath, 'convert', '--in', path.resolve(input), '--out', 'output', '--to', format], {
      cwd: testDir,
      encoding: 'utf8',
      timeout: 60_000,
    });
  }

  async function writeZip(filename: string, files: Record<string, string>): Promise<string> {
    const zip = new JSZip();
    for (const [name, contents] of Object.entries(files)) zip.file(name, contents);
    const outputPath = path.join(testDir, filename);
    fs.writeFileSync(outputPath, await zip.generateAsync({ type: 'nodebuffer' }));
    return outputPath;
  }

  it('converts DOCX to PDF', async () => {
    const input = await writeZip('document.docx', {
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Office E2E DOCX</w:t></w:r></w:p></w:body></w:document>',
    });

    runCli(input, 'pdf');
    expect(fs.readFileSync(path.join(outputDir, 'document.pdf')).subarray(0, 4).toString()).toBe('%PDF');
  }, 60_000);

  it('converts XLSX to HTML', async () => {
    const input = await writeZip('spreadsheet.xlsx', {
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>',
      '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="OfficeE2E" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/sharedStrings.xml': '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Office E2E XLSX</t></si></sst>',
      'xl/worksheets/sheet1.xml': '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>',
    });

    runCli(input, 'html');
    expect(fs.readFileSync(path.join(outputDir, 'spreadsheet.html'), 'utf8')).toContain('Office E2E XLSX');
  }, 60_000);

  it('converts PPTX to text', async () => {
    const input = await writeZip('slides.pptx', {
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>',
      '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>',
      'ppt/presentation.xml': '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
      'ppt/slides/slide1.xml': '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Office E2E PPTX</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
    });

    runCli(input, 'txt');
    expect(fs.readFileSync(path.join(outputDir, 'slides.txt'), 'utf8')).toContain('Office E2E PPTX');
  }, 60_000);

  it('converts ODT to PDF', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
    zip.file('content.xml', '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:p>Office E2E ODT</text:p></office:text></office:body></office:document-content>');
    const input = path.join(testDir, 'text.odt');
    fs.writeFileSync(input, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

    runCli(input, 'pdf');
    expect(fs.readFileSync(path.join(outputDir, 'text.pdf')).subarray(0, 4).toString()).toBe('%PDF');
  }, 60_000);

  it('converts RTF to Markdown', () => {
    const input = path.join(testDir, 'notes.rtf');
    fs.writeFileSync(input, String.raw`{\rtf1\ansi\deff0{\fonttbl{\f0 Times New Roman;}}
\pard Office E2E RTF\par
}`);

    runCli(input, 'md');
    expect(fs.readFileSync(path.join(outputDir, 'notes.md'), 'utf8')).toContain('Office E2E RTF');
  }, 60_000);
});
