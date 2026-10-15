import { Argument, Command } from 'commander';
import { generateCompletionScript, COMPLETION_SHELLS } from '../src/completions';

function sampleProgram(): Command {
  const program = new Command().name('tool').version('1.0.0');
  program.command('convert')
    .description("Convert it's files [fast]: really")
    .requiredOption('-i, --in <path>', 'Input file')
    .option('-t, --to <format>', 'Target format')
    .option('--dry-run', 'Plan only');
  program.command('pdf')
    .description('PDF operations')
    .option('--merge <files...>', 'Merge files');
  const preset = program.command('preset').description('Preset operations');
  preset.command('create').description('Create').option('-s, --scope <scope>', 'Scope');
  program.command('completion')
    .description('Completion')
    .addArgument(new Argument('<shell>', 'Shell').choices(['bash', 'zsh']));
  return program;
}

const values = (_path: string[], option: { long?: string }) =>
  option.long === '--to' ? ['png', 'jpg', 'bad value'] : option.long === '--scope' ? ['global', 'local'] : undefined;

describe('generateCompletionScript', () => {
  it.each(COMPLETION_SHELLS)('covers every command and option for %s', (shell) => {
    const script = generateCompletionScript(shell, sampleProgram(), values);
    for (const word of ['convert', 'pdf', 'preset', 'create', 'completion', 'help', 'dry-run', 'merge', 'scope', 'version']) {
      expect(script).toContain(word);
    }
    expect(script).toContain('png jpg');
    expect(script).toContain('global local');
    expect(script).toContain('bash zsh');
    expect(script).not.toContain('bad value');
  });

  it('wires bash completion to the program name with file fallback', () => {
    const script = generateCompletionScript('bash', sampleProgram(), values);
    expect(script).toContain('complete -o default -F _tool_completion tool');
    expect(script).toContain('"/convert -t"|"/convert --to") COMPREPLY=($(compgen -W "png jpg" -- "$cur"))');
    expect(script).toContain('/preset/create');
  });

  it('escapes zsh descriptions and marks file and variadic options', () => {
    const script = generateCompletionScript('zsh', sampleProgram(), values);
    expect(script.startsWith('#compdef tool\n')).toBe(true);
    expect(script).toContain(`'(-i --in)'{-i,--in}'[Input file]:path:_files'`);
    expect(script).toContain(`'*--merge[Merge files]:files:_files'`);
    expect(script).toContain(`'convert:Convert it'\\''s files [fast]: really'`);
    expect(script).toContain('compdef _tool tool');
  });

  it('uses file completion only for path-like fish options', () => {
    const script = generateCompletionScript('fish', sampleProgram(), values);
    expect(script).toContain("complete -c tool -n '__fish_seen_subcommand_from convert' -s i -l in -r -F -d 'Input file'");
    expect(script).toContain("-s t -l to -x -a 'png jpg'");
    expect(script).toContain("-a convert -d 'Convert it\\'s files [fast]: really'");
    expect(script).toContain("'__fish_seen_subcommand_from preset; and not __fish_seen_subcommand_from create help'");
  });

  it('rejects unsafe program names', () => {
    expect(() => generateCompletionScript('bash', new Command().name('bad name'))).toThrow();
  });
});
