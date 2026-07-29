import fs from 'fs';
import { getTestFilePath } from '../setup';
import {
  findMicrosoftWordExecutable,
  renderOfficeToPdfWithMicrosoftWord,
} from '../../src/adapters/office/microsoft-word-renderer';

describe('Microsoft Word PDF renderer', () => {
  it('uses MICROSOFT_WORD_PATH on Windows when it points to Word', () => {
    const executable = getTestFilePath('WINWORD.EXE');
    fs.writeFileSync(executable, '');

    expect(findMicrosoftWordExecutable({
      platform: 'win32',
      environment: { MICROSOFT_WORD_PATH: executable },
      executablePaths: [],
    })).toBe(executable);
  });

  it('reports Word as unavailable outside Windows', () => {
    const executable = getTestFilePath('WINWORD.EXE');
    fs.writeFileSync(executable, '');

    expect(findMicrosoftWordExecutable({
      platform: 'linux',
      environment: { MICROSOFT_WORD_PATH: executable },
      executablePaths: [],
    })).toBeUndefined();
  });

  it('writes Word output to the requested PDF path', async () => {
    const executable = getTestFilePath('WINWORD.EXE');
    const inputPath = getTestFilePath('resume.docx');
    const outputPath = getTestFilePath('resume-output.pdf');
    fs.writeFileSync(executable, '');
    fs.writeFileSync(inputPath, 'docx content');

    const converted = await renderOfficeToPdfWithMicrosoftWord(inputPath, outputPath, {
      platform: 'win32',
      environment: { MICROSOFT_WORD_PATH: executable },
      executablePaths: [],
      run: async (scriptPath, _inputPath, requestedOutputPath) => {
        const script = fs.readFileSync(scriptPath, 'utf-8');
        expect(script).toContain('New-Object -ComObject Word.Application');
        expect(script).toContain('ExportAsFixedFormat');
        fs.writeFileSync(requestedOutputPath, '%PDF-word');
      },
    });

    expect(converted).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('%PDF-word');
  });
});
