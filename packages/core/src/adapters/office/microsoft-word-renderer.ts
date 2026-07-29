import { execFile as execFileCallback } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);

export type MicrosoftWordRunner = (scriptPath: string, inputPath: string, outputPath: string) => Promise<void>;

export interface MicrosoftWordOptions {
  environment?: NodeJS.ProcessEnv;
  executablePaths?: string[];
  platform?: NodeJS.Platform;
  run?: MicrosoftWordRunner;
}

function defaultExecutablePaths(environment: NodeJS.ProcessEnv): string[] {
  const programFiles = [
    environment.ProgramFiles || 'C:\\Program Files',
    environment['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
  ];
  const versions = ['Office16', 'Office15', 'Office14', 'Office12'];
  const pathCandidates = (environment.PATH || '')
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(entry, 'WINWORD.EXE'));

  return [
    ...pathCandidates,
    ...programFiles.flatMap((programFilesPath) => versions.flatMap((version) => [
      path.join(programFilesPath, 'Microsoft Office', 'root', version, 'WINWORD.EXE'),
      path.join(programFilesPath, 'Microsoft Office', version, 'WINWORD.EXE'),
    ])),
  ];
}

export function findMicrosoftWordExecutable(options: MicrosoftWordOptions = {}): string | undefined {
  const environment = options.environment || process.env;
  const platform = options.platform || process.platform;
  if (platform !== 'win32') return undefined;

  const candidates = [
    environment.MICROSOFT_WORD_PATH,
    ...(options.executablePaths || defaultExecutablePaths(environment)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function wordAutomationScript(): string {
  return [
    'param([string]$InputPath, [string]$OutputPath)',
    '$word = $null',
    '$document = $null',
    'try {',
    '  $word = New-Object -ComObject Word.Application',
    '  $word.Visible = $false',
    '  $word.DisplayAlerts = 0',
    '  $document = $word.Documents.Open($InputPath, $false, $true)',
    '  $document.ExportAsFixedFormat($OutputPath, 17)',
    '  if (-not (Test-Path -LiteralPath $OutputPath)) { throw "Microsoft Word did not create a PDF file" }',
    '} finally {',
    '  if ($document -ne $null) { $document.Close($false) }',
    '  if ($word -ne $null) { $word.Quit() }',
    '}',
  ].join('\r\n');
}

async function runMicrosoftWord(scriptPath: string, inputPath: string, outputPath: string): Promise<void> {
  const powershellPath = path.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  );
  const command = fs.existsSync(powershellPath) ? powershellPath : 'powershell.exe';
  await execFile(command, [
    '-NoProfile',
    '-NonInteractive',
    '-Sta',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    inputPath,
    outputPath,
  ], { timeout: 120_000, windowsHide: true });
}

export async function renderOfficeToPdfWithMicrosoftWord(
  inputPath: string,
  outputPath: string,
  options: MicrosoftWordOptions = {}
): Promise<boolean> {
  if (!findMicrosoftWordExecutable(options)) return false;

  const temporaryRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fileconverter-word-'));
  const scriptPath = path.join(temporaryRoot, 'convert-to-pdf.ps1');

  try {
    await fs.promises.writeFile(scriptPath, wordAutomationScript(), 'utf-8');
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await (options.run || runMicrosoftWord)(scriptPath, inputPath, outputPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error('Microsoft Word completed without creating a PDF file');
    }

    return true;
  } finally {
    await fs.promises.rm(temporaryRoot, { recursive: true, force: true });
  }
}
