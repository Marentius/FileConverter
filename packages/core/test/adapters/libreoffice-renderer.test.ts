import fs from 'fs';
import path from 'path';
import { getTestFilePath } from '../setup';
import {
  findLibreOfficeExecutable,
  renderOfficeToPdfWithLibreOffice,
} from '../../src/adapters/office/libreoffice-renderer';

describe('LibreOffice PDF renderer', () => {
  it('uses LIBREOFFICE_PATH when it points to an existing executable', () => {
    const executable = getTestFilePath('soffice.exe');
    fs.writeFileSync(executable, '');

    expect(findLibreOfficeExecutable({
      environment: { LIBREOFFICE_PATH: executable },
      executablePaths: [],
    })).toBe(executable);
  });

  it('reports LibreOffice as unavailable when no candidate exists', () => {
    expect(findLibreOfficeExecutable({
      environment: {},
      executablePaths: [],
    })).toBeUndefined();
  });

  it('writes LibreOffice output to the requested PDF path', async () => {
    const executable = getTestFilePath('soffice.exe');
    const inputPath = getTestFilePath('resume.docx');
    const outputPath = getTestFilePath('custom-name.pdf');
    fs.writeFileSync(executable, '');
    fs.writeFileSync(inputPath, 'docx content');

    const converted = await renderOfficeToPdfWithLibreOffice(inputPath, outputPath, {
      environment: { LIBREOFFICE_PATH: executable },
      executablePaths: [],
      run: async (_command, args) => {
        const outputDirectory = args[args.indexOf('--outdir') + 1];
        fs.writeFileSync(path.join(outputDirectory, 'resume.pdf'), '%PDF-1.7');
      },
    });

    expect(converted).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('%PDF-1.7');
  });
});
