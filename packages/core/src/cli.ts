#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { Converter } from './converter';
import { getSupportedFormats } from './file-detector';
import { listPresets } from './presets/image-presets';
import { listPdfPresets } from './presets/pdf-presets';
import { LibreOfficeDetector } from './utils/libreoffice-detector';
import { PdfToolsDetector } from './utils/pdf-tools-detector';
import { PandocDetector } from './utils/pandoc-detector';
import { OcrDetector } from './utils/ocr-detector';
import { ConfigManager } from './config/config-manager';
import logger from './logger';
import chalk from 'chalk';

const program = new Command();

program
  .name('converter')
  .description('Universelt filkonverteringsverktøy med batch-støtte')
  .version('1.0.0');

program
  .command('convert')
  .description('Konverter filer til spesifisert format')
  .requiredOption('-i, --in <path>', 'Input fil eller mappe')
  .requiredOption('-o, --out <path>', 'Output mappe')
  .requiredOption('-t, --to <format>', 'Målformat (f.eks. png, pdf, docx)')
  .option('-r, --recursive', 'Søk rekursivt i undermapper')
  .option('--dry-run', 'Vis hva som ville skjedd uten å konvertere')
  .option('--concurrency <number>', 'Antall parallelle jobber (default: 1)', 
    (value) => parseInt(value, 10))
  .option('--retries <number>', 'Antall retry-forsøk per jobb (default: 2)', 
    (value) => parseInt(value, 10))
  .option('--quality <number>', 'Kvalitet for bildekonvertering (1-100)', 
    (value) => parseInt(value, 10))
  .option('--max-width <number>', 'Maksimal bredde for bilder', 
    (value) => parseInt(value, 10))
  .option('--max-height <number>', 'Maksimal høyde for bilder', 
    (value) => parseInt(value, 10))
  .option('--strip-metadata', 'Fjern metadata fra bilder')
  .option('--preset <name>', 'Bruk preset (image/web, image/print, image/thumbnail, etc.)')
  .action(async (options) => {
    try {
      const converter = new Converter();
      
      await converter.convert({
        input: options.in,
        output: options.out,
        format: options.to,
        recursive: options.recursive || false,
        dryRun: options.dryRun || false,
        concurrency: options.concurrency,
        retries: options.retries,
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        stripMetadata: options.stripMetadata || false,
        preset: options.preset
      });
      
    } catch (error) {
      logger.error('CLI feil', { error });
      console.error(chalk.red('Feil:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('pdf')
  .description('PDF-operasjoner (komprimer, merge, split)')
  .option('--compress <file>', 'Komprimer PDF-fil')
  .option('--merge <files...>', 'Slå sammen flere PDF-filer')
  .option('--split <file>', 'Del opp PDF-fil')
  .option('--pages <range>', 'Sidespekter for split (f.eks. 1-3,5,7-9)')
  .option('--preset <name>', 'PDF-preset (screen, ebook, printer, prepress)')
  .requiredOption('-o, --out <file>', 'Output PDF-fil')
  .action(async (options) => {
    try {
      const converter = new Converter();
      
      let operation: 'compress' | 'merge' | 'split' | undefined;
      let input: string | undefined;
      let inputFiles: string[] | undefined;
      
      if (options.compress) {
        operation = 'compress';
        input = options.compress;
      } else if (options.merge && options.merge.length > 0) {
        operation = 'merge';
        inputFiles = options.merge;
        input = options.merge[0]; // Bruk første fil som hovedinput
      } else if (options.split) {
        operation = 'split';
        input = options.split;
      } else {
        throw new Error('Må spesifisere --compress, --merge eller --split');
      }
      
      const convertOptions: any = {
        input: input!,
        output: options.out,
        format: 'pdf',
        operation,
        pages: options.pages,
        preset: options.preset
      };
      
      if (inputFiles) {
        convertOptions.inputFiles = inputFiles;
      }
      
      await converter.convert(convertOptions);
      
    } catch (error) {
      logger.error('PDF CLI feil', { error });
      console.error(chalk.red('Feil:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('ocr')
  .description('OCR-operasjoner (PDF → søkbar PDF, bilde → tekst)')
  .requiredOption('-i, --in <file>', 'Input fil (PDF, PNG, JPG, etc.)')
  .requiredOption('-o, --out <file>', 'Output fil')
  .option('--lang <language>', 'Språk for OCR (f.eks. eng, nno, deu)')
  .option('--quality <level>', 'OCR-kvalitet (fast, standard, high)', 'standard')
  .action(async (options) => {
    try {
      const converter = new Converter();
      
      // Bestem output-format basert på filnavn
      const outputExt = path.extname(options.out).toLowerCase();
      let outputFormat = 'pdf'; // Standard
      
      if (outputExt === '.txt') {
        outputFormat = 'txt';
      } else if (outputExt === '.pdf') {
        outputFormat = 'pdf';
      }
      
      await converter.convert({
        input: options.in,
        output: options.out,
        format: outputFormat,
        language: options.lang,
        quality: options.quality
      });
      
    } catch (error) {
      logger.error('OCR CLI feil', { error });
      console.error(chalk.red('Feil:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('formats')
  .description('Vis støttede filformater')
  .action(() => {
    const formats = getSupportedFormats();
    
    console.log(chalk.bold.blue('=== STØTTEDE FILFORMATER ==='));
    console.log('');
    
    // Grupper formater etter type
    const imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'heic'];
    const documentFormats = ['docx', 'pptx', 'xlsx', 'pdf', 'md', 'html', 'rtf', 'txt'];
    const mediaFormats = ['mp4', 'mov', 'mp3', 'wav'];
    
    console.log(chalk.bold.green('📷 Bildeformater:'));
    console.log('  ' + imageFormats.filter(f => formats.includes(f)).join(', '));
    console.log('');
    
    console.log(chalk.bold.green('📄 Dokumentformater:'));
    console.log('  ' + documentFormats.filter(f => formats.includes(f)).join(', '));
    console.log('');
    
    console.log(chalk.bold.green('🎵 Mediaformater:'));
    console.log('  ' + mediaFormats.filter(f => formats.includes(f)).join(', '));
    console.log('');
    
    console.log(chalk.gray(`Totalt: ${formats.length} støttede formater`));
  });

program
  .command('presets')
  .description('Vis tilgjengelige presets')
  .action(() => {
    const presets = listPresets();
    
    console.log(chalk.bold.blue('=== TILGJENGELIGE PRESETS ==='));
    console.log('');
    
    presets.forEach(preset => {
      console.log(chalk.bold.green(`${preset.name}:`));
      console.log(`  ${preset.description}`);
      console.log(`  Parametere: ${JSON.stringify(preset.parameters, null, 2)}`);
      console.log('');
    });
  });

program
  .command('check-libreoffice')
  .description('Sjekk LibreOffice-installasjon')
  .action(async () => {
    const detector = LibreOfficeDetector.getInstance();
    const info = await detector.detectLibreOffice();
    
    console.log(chalk.bold.blue('=== LIBREOFFICE STATUS ==='));
    console.log('');
    
    if (info.found) {
      console.log(chalk.green('✅ LibreOffice funnet'));
      console.log(`   Plassering: ${info.path}`);
      if (info.version) {
        console.log(`   Versjon: ${info.version}`);
      }
    } else {
      console.log(chalk.red('❌ LibreOffice ikke funnet'));
      if (info.error) {
        console.log(`   Feil: ${info.error}`);
      }
    }
    console.log('');
  });

program
  .command('check-pdf-tools')
  .description('Sjekk PDF-verktøy (Ghostscript og qpdf)')
  .action(async () => {
    const detector = PdfToolsDetector.getInstance();
    const info = await detector.detectPdfTools();
    
    console.log(chalk.bold.blue('=== PDF-VERKTØY STATUS ==='));
    console.log('');
    
    // Ghostscript
    if (info.ghostscript.found) {
      console.log(chalk.green('✅ Ghostscript funnet'));
      console.log(`   Plassering: ${info.ghostscript.path}`);
      if (info.ghostscript.version) {
        console.log(`   Versjon: ${info.ghostscript.version}`);
      }
    } else {
      console.log(chalk.red('❌ Ghostscript ikke funnet'));
      if (info.ghostscript.error) {
        console.log(`   Feil: ${info.ghostscript.error}`);
      }
    }
    console.log('');
    
    // qpdf
    if (info.qpdf.found) {
      console.log(chalk.green('✅ qpdf funnet'));
      console.log(`   Plassering: ${info.qpdf.path}`);
      if (info.qpdf.version) {
        console.log(`   Versjon: ${info.qpdf.version}`);
      }
    } else {
      console.log(chalk.red('❌ qpdf ikke funnet'));
      if (info.qpdf.error) {
        console.log(`   Feil: ${info.qpdf.error}`);
      }
    }
    console.log('');
  });

program
  .command('check-pandoc')
  .description('Sjekk Pandoc og LaTeX')
  .action(async () => {
    const detector = PandocDetector.getInstance();
    const info = await detector.detectPandocTools();
    
    console.log(chalk.bold.blue('=== PANDOC STATUS ==='));
    console.log('');
    
    // Pandoc
    if (info.pandoc.found) {
      console.log(chalk.green('✅ Pandoc funnet'));
      console.log(`   Plassering: ${info.pandoc.path}`);
      if (info.pandoc.version) {
        console.log(`   Versjon: ${info.pandoc.version}`);
      }
    } else {
      console.log(chalk.red('❌ Pandoc ikke funnet'));
      if (info.pandoc.error) {
        console.log(`   Feil: ${info.pandoc.error}`);
      }
    }
    console.log('');
    
    // LaTeX
    if (info.latex.found) {
      console.log(chalk.green('✅ LaTeX funnet'));
      console.log(`   Plassering: ${info.latex.path}`);
      if (info.latex.version) {
        console.log(`   Versjon: ${info.latex.version}`);
      }
      if (info.latex.distribution) {
        console.log(`   Distribusjon: ${info.latex.distribution}`);
      }
    } else {
      console.log(chalk.yellow('⚠️  LaTeX ikke funnet (valgfritt for høyere PDF-kvalitet)'));
      if (info.latex.error) {
        console.log(`   Feil: ${info.latex.error}`);
      }
    }
    console.log('');
  });

program
  .command('check-ocr')
  .description('Sjekk OCR-verktøy (ocrmypdf og Tesseract)')
  .action(async () => {
    const detector = OcrDetector.getInstance();
    const info = await detector.detectOcrTools();
    
    console.log(chalk.bold.blue('=== OCR STATUS ==='));
    console.log('');
    
    // ocrmypdf
    if (info.ocrmypdf.found) {
      console.log(chalk.green('✅ ocrmypdf funnet'));
      console.log(`   Plassering: ${info.ocrmypdf.path}`);
      if (info.ocrmypdf.version) {
        console.log(`   Versjon: ${info.ocrmypdf.version}`);
      }
    } else {
      console.log(chalk.red('❌ ocrmypdf ikke funnet'));
      if (info.ocrmypdf.error) {
        console.log(`   Feil: ${info.ocrmypdf.error}`);
      }
    }
    console.log('');
    
    // Tesseract
    if (info.tesseract.found) {
      console.log(chalk.green('✅ Tesseract funnet'));
      console.log(`   Plassering: ${info.tesseract.path}`);
      if (info.tesseract.version) {
        console.log(`   Versjon: ${info.tesseract.version}`);
      }
    } else {
      console.log(chalk.red('❌ Tesseract ikke funnet'));
      if (info.tesseract.error) {
        console.log(`   Feil: ${info.tesseract.error}`);
      }
    }
    console.log('');
    
    // Språk
    if (info.languages.length > 0) {
      console.log(chalk.green('✅ Tesseract språk tilgjengelig:'));
      console.log(`   ${info.languages.slice(0, 10).join(', ')}${info.languages.length > 10 ? '...' : ''}`);
      console.log(`   Totalt: ${info.languages.length} språk`);
    } else {
      console.log(chalk.yellow('⚠️  Ingen Tesseract språk funnet'));
    }
    console.log('');
  });

program
  .command('preset')
  .description('Preset-operasjoner')
  .addCommand(
    new Command('list')
      .description('List alle tilgjengelige presets')
      .action(async () => {
        try {
          const configManager = ConfigManager.getInstance();
          const presets = await configManager.listPresets();
          
          console.log(chalk.bold.blue('=== TILGJENGELIGE PRESETS ==='));
          console.log('');
          
          // Grupper etter scope
          const builtin = presets.filter(p => p.scope === 'builtin');
          const global = presets.filter(p => p.scope === 'global');
          const local = presets.filter(p => p.scope === 'local');
          
          if (builtin.length > 0) {
            console.log(chalk.bold.green('🔧 Built-in presets:'));
            builtin.forEach(preset => {
              console.log(`  ${chalk.cyan(preset.name)} - ${preset.description}`);
              console.log(`    Type: ${preset.type}, Parametere: ${JSON.stringify(preset.parameters)}`);
            });
            console.log('');
          }
          
          if (global.length > 0) {
            console.log(chalk.bold.green('👤 User presets (global):'));
            global.forEach(preset => {
              console.log(`  ${chalk.cyan(preset.name)} - ${preset.description}`);
              console.log(`    Type: ${preset.type}, Parametere: ${JSON.stringify(preset.parameters)}`);
            });
            console.log('');
          }
          
          if (local.length > 0) {
            console.log(chalk.bold.green('📁 Project presets (local):'));
            local.forEach(preset => {
              console.log(`  ${chalk.cyan(preset.name)} - ${preset.description}`);
              console.log(`    Type: ${preset.type}, Parametere: ${JSON.stringify(preset.parameters)}`);
            });
            console.log('');
          }
          
          if (presets.length === 0) {
            console.log(chalk.yellow('Ingen presets funnet.'));
          }
          
        } catch (error) {
          logger.error('Feil ved listing av presets', { error });
          console.error(chalk.red('Feil:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('create')
      .description('Opprett en ny preset')
      .requiredOption('-n, --name <name>', 'Preset navn')
      .requiredOption('-d, --description <description>', 'Preset beskrivelse')
      .requiredOption('-t, --type <type>', 'Preset type (image|pdf|document)')
      .requiredOption('-p, --parameters <parameters>', 'Preset parametere (format: key1=value1;key2=value2)')
      .option('-s, --scope <scope>', 'Preset scope (global|local)', 'local')
      .action(async (options) => {
        try {
          const configManager = ConfigManager.getInstance();
          
          // Parse parametere
          const parameters = configManager.parsePresetParameters(options.parameters);
          
          // Valider parametere
          if (!configManager.validatePresetParameters(options.type, parameters)) {
            throw new Error(`Ugyldige parametere for type '${options.type}'`);
          }
          
          await configManager.createPreset(
            options.name,
            options.description,
            options.type as 'image' | 'pdf' | 'document',
            parameters,
            options.scope as 'global' | 'local'
          );
          
          console.log(chalk.green(`✅ Preset '${options.name}' opprettet!`));
          console.log(`   Type: ${options.type}`);
          console.log(`   Scope: ${options.scope}`);
          console.log(`   Parametere: ${JSON.stringify(parameters)}`);
          
        } catch (error) {
          logger.error('Feil ved opprettelse av preset', { error });
          console.error(chalk.red('Feil:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Slett en preset')
      .requiredOption('-n, --name <name>', 'Preset navn')
      .option('-s, --scope <scope>', 'Preset scope (global|local)', 'local')
      .action(async (options) => {
        try {
          const configManager = ConfigManager.getInstance();
          
          const deleted = await configManager.deletePreset(
            options.name,
            options.scope as 'global' | 'local'
          );
          
          if (deleted) {
            console.log(chalk.green(`✅ Preset '${options.name}' slettet!`));
          } else {
            console.log(chalk.yellow(`⚠️  Preset '${options.name}' ikke funnet i scope '${options.scope}'`));
          }
          
        } catch (error) {
          logger.error('Feil ved sletting av preset', { error });
          console.error(chalk.red('Feil:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  );

program
  .command('pdf-presets')
  .description('Vis tilgjengelige PDF-presets')
  .action(() => {
    const presets = listPdfPresets();
    
    console.log(chalk.bold.blue('=== TILGJENGELIGE PDF-PRESETS ==='));
    console.log('');
    
    presets.forEach(preset => {
      console.log(chalk.bold.green(`${preset.name}:`));
      console.log(`  ${preset.description}`);
      console.log(`  PDFSETTINGS: ${preset.ghostscriptSettings.dPDFSETTINGS}`);
      console.log(`  Kompatibilitet: ${preset.ghostscriptSettings.dCompatibilityLevel}`);
      console.log(`  Oppløsning: ${preset.ghostscriptSettings.dColorImageResolution} dpi`);
      console.log('');
    });
  });

program
  .command('version')
  .description('Vis versjon og systeminformasjon')
  .action(() => {
    console.log(chalk.bold.blue('=== FILECONVERTER VERSJON ==='));
    console.log(`Versjon: ${program.version()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Plattform: ${process.platform} ${process.arch}`);
    console.log(`Arbeidsmappe: ${process.cwd()}`);
  });

// Håndter uventede feil
process.on('uncaughtException', (error) => {
  logger.error('Uventet feil', { error });
  console.error(chalk.red('Kritisk feil:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Uventet promise rejection', { reason, promise });
  console.error(chalk.red('Promise rejection:'), reason);
  process.exit(1);
});

// Start CLI
if (require.main === module) {
  program.parse();
}
