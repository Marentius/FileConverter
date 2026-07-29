import { execFile as execFileCallback } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);

export type LibreOfficeRunner = (command: string, args: string[]) => Promise<void>;

export interface LibreOfficeOptions {
  environment?: NodeJS.ProcessEnv;
  executablePaths?: string[];
  platform?: NodeJS.Platform;
  run?: LibreOfficeRunner;
}

function defaultExecutablePaths(platform: NodeJS.Platform, environment: NodeJS.ProcessEnv): string[] {
  const executable = platform === 'win32' ? 'soffice.exe' : 'soffice';
  const pathEntries = (environment.PATH || '').split(path.delimiter).filter(Boolean);
  const pathCandidates = pathEntries.map((entry) => path.join(entry, executable));

  if (platform === 'win32') {
    return [
      ...pathCandidates,
      path.join(environment.ProgramFiles || 'C:\\Program Files', 'LibreOffice', 'program', executable),
      path.join(environment['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'LibreOffice', 'program', executable),
    ];
  }

  if (platform === 'darwin') {
    return [...pathCandidates, '/Applications/LibreOffice.app/Contents/MacOS/soffice'];
  }

  return [...pathCandidates, '/usr/bin/soffice', '/usr/local/bin/soffice'];
}

export function findLibreOfficeExecutable(options: LibreOfficeOptions = {}): string | undefined {
  const environment = options.environment || process.env;
  const platform = options.platform || process.platform;
  const candidates = [
    environment.LIBREOFFICE_PATH,
    ...(options.executablePaths || defaultExecutablePaths(platform, environment)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function runLibreOffice(command: string, args: string[]): Promise<void> {
  await execFile(command, args, { timeout: 120_000, windowsHide: true });
}

export async function renderOfficeToPdfWithLibreOffice(
  inputPath: string,
  outputPath: string,
  options: LibreOfficeOptions = {}
): Promise<boolean> {
  const executable = findLibreOfficeExecutable(options);
  if (!executable) return false;

  const temporaryRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fileconverter-libreoffice-'));
  const profileDirectory = path.join(temporaryRoot, 'profile');
  const outputDirectory = path.join(temporaryRoot, 'output');
  const generatedPdf = path.join(outputDirectory, `${path.parse(inputPath).name}.pdf`);

  try {
    await fs.promises.mkdir(profileDirectory);
    await fs.promises.mkdir(outputDirectory);
    await (options.run || runLibreOffice)(executable, [
      '--headless',
      `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
      '--convert-to',
      'pdf:writer_pdf_Export',
      '--outdir',
      outputDirectory,
      inputPath,
    ]);

    if (!fs.existsSync(generatedPdf)) {
      throw new Error('LibreOffice completed without creating a PDF file');
    }

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.copyFile(generatedPdf, outputPath);
    return true;
  } catch {
    return false;
  } finally {
    await fs.promises.rm(temporaryRoot, { recursive: true, force: true });
  }
}
