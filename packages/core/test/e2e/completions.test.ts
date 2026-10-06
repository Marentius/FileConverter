import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const cliPath = path.join(__dirname, '../../dist/cli.js');
const hasShell = (shell: string) => spawnSync(shell, ['-c', 'exit 0']).status === 0;

function script(shell: string): string {
  const result = spawnSync(process.execPath, [cliPath, 'completion', shell], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, FILECONVERTER_DISABLE_FILE_LOGS: '1', LOG_LEVEL: 'debug' },
  });
  expect(result.status).toBe(0);
  return result.stdout;
}

describe('CLI shell completions', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-completions-'));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('rejects unknown shells', () => {
    const result = spawnSync(process.execPath, [cliPath, 'completion', 'powershell'], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('bash, zsh, fish');
  });

  it.runIf(hasShell('bash'))('completes subcommands, flags and values in bash', () => {
    const file = path.join(dir, 'converter.bash');
    fs.writeFileSync(file, script('bash'));
    const complete = (...words: string[]) => {
      const program = `source "$1"; shift; COMP_WORDS=("$@"); COMP_CWORD=$(( $# - 1 )); _converter_completion; echo "\${COMPREPLY[*]}"`;
      const result = spawnSync('bash', ['-c', program, 'bash', file, 'converter', ...words], { encoding: 'utf8' });
      expect(result.status).toBe(0);
      return result.stdout.trim().split(/\s+/).filter(Boolean);
    };

    expect(complete('')).toEqual(expect.arrayContaining(['convert', 'pdf', 'ocr', 'formats', 'preset', 'completion']));
    expect(complete('convert', '--')).toEqual(expect.arrayContaining(['--in', '--out', '--to', '--preset', '--dry-run', '--quality']));
    expect(complete('convert', '--to', '')).toEqual(expect.arrayContaining(['png', 'pdf', 'docx', 'webp']));
    expect(complete('convert', '--preset', 'image/')).toEqual(expect.arrayContaining(['image/web', 'image/print']));
    expect(complete('pdf', '--')).toEqual(expect.arrayContaining(['--merge', '--split', '--compress', '--pages']));
    expect(complete('preset', '')).toEqual(expect.arrayContaining(['list', 'create', 'delete']));
    expect(complete('completion', '')).toEqual(['bash', 'zsh', 'fish']);
    expect(complete('convert', '--in', '')).toEqual([]);
  });

  it.runIf(hasShell('zsh'))('produces a valid zsh completion function', () => {
    const file = path.join(dir, '_converter');
    fs.writeFileSync(file, script('zsh'));
    const result = spawnSync('zsh', ['-n', file], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).toMatch(/^#compdef converter\n/);
  });

  it.runIf(hasShell('fish'))('completes subcommands, flags and values in fish', () => {
    const file = path.join(dir, 'converter.fish');
    fs.writeFileSync(file, script('fish'));
    const complete = (line: string) => {
      const result = spawnSync('fish', ['--no-config', '-c', 'source $argv[1]; complete -C $argv[2]', file, line], { encoding: 'utf8' });
      expect(result.status).toBe(0);
      return result.stdout.trim().split('\n').map(entry => entry.split('\t')[0]);
    };

    expect(complete('converter ')).toEqual(expect.arrayContaining(['convert', 'pdf', 'ocr', 'preset', 'completion']));
    expect(complete('converter convert --')).toEqual(expect.arrayContaining(['--in', '--to', '--preset', '--dry-run']));
    expect(complete('converter convert --to ')).toEqual(expect.arrayContaining(['png', 'pdf', 'docx']));
    expect(complete('converter preset create --scope ')).toEqual(['global', 'local']);
  });
});
