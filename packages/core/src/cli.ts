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
  .description('Universal file conversion tool with batch support')
  .version('1.0.0');

program
  .command('convert')
  .description('Convert files to specified format')
  .requiredOption('-i, --in <path>', 'Input file or folder')
  .requiredOption('-o, --out <path>', 'Output folder')
  .requiredOption('-t, --to <format>', 'Target format (e.g., png, pdf, docx)')
  .option('-r, --recursive', 'Search recursively in subfolders')
  .option('--dry-run', 'Show what would happen without converting')
  .option('--concurrency <number>', 'Number of parallel jobs (default: 1)', 
    (value) => parseInt(value, 10))
  .option('--retries <number>', 'Number of retry attempts per job (default: 2)', 
    (value) => parseInt(value, 10))
  .option('--quality <number>', 'Quality for image conversion (1-100)', 
    (value) => parseInt(value, 10))
  .option('--max-width <number>', 'Maximum width for images', 
    (value) => parseInt(value, 10))
  .option('--max-height <number>', 'Maximum height for images', 
    (value) => parseInt(value, 10))
  .option('--strip-metadata', 'Remove metadata from images')
  .option('--preset <name>', 'Use preset (image/web, image/print, image/thumbnail, etc.)')
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
      logger.error('CLI error', { error });
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('pdf')
  .description('PDF operations (compress, merge, split)')
  .option('--compress <file>', 'Compress PDF file')
  .option('--merge <files...>', 'Merge multiple PDF files')
  .option('--split <file>', 'Split PDF file')
  .option('--pages <range>', 'Page ranges for split (e.g., 1-3,5,7-9)')
  .option('--preset <name>', 'PDF preset (screen, ebook, printer, prepress)')
  .requiredOption('-o, --out <file>', 'Output PDF file')
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
        input = options.merge[0]; // Use first file as main input
      } else if (options.split) {
        operation = 'split';
        input = options.split;
      } else {
        throw new Error('Must specify --compress, --merge or --split');
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
      logger.error('PDF CLI error', { error });
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('ocr')
  .description('OCR operations (PDF → searchable PDF, image → text)')
  .requiredOption('-i, --in <file>', 'Input file (PDF, PNG, JPG, etc.)')
  .requiredOption('-o, --out <file>', 'Output file')
  .option('--lang <language>', 'Language for OCR (e.g., eng, nno, deu)')
  .option('--quality <level>', 'OCR quality (fast, standard, high)', 'standard')
  .action(async (options) => {
    try {
      const converter = new Converter();
      
      // Determine output format based on filename
      const outputExt = path.extname(options.out).toLowerCase();
      let outputFormat = 'pdf'; // Default
      
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
      logger.error('OCR CLI error', { error });
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('formats')
  .description('Show supported file formats')
  .action(() => {
    const formats = getSupportedFormats();
    
    console.log(chalk.bold.blue('=== SUPPORTED FILE FORMATS ==='));
    console.log('');
    
    // Group formats by type
    const imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'heic'];
    const documentFormats = ['docx', 'pptx', 'xlsx', 'pdf', 'md', 'html', 'rtf', 'txt'];
    const mediaFormats = ['mp4', 'mov', 'mp3', 'wav'];
    
    console.log(chalk.bold.green('📷 Image Formats:'));
    console.log('  ' + imageFormats.filter(f => formats.includes(f)).join(', '));
    console.log('');
    
    console.log(chalk.bold.green('📄 Document Formats:'));
    console.log('  ' + documentFormats.filter(f => formats.includes(f)).join(', '));
    console.log('');
    
    console.log(chalk.bold.green('🎵 Media Formats:'));
    console.log('  ' + mediaFormats.filter(f => formats.includes(f)).join(', '));
    console.log('');
    
    console.log(chalk.gray(`Total: ${formats.length} supported formats`));
  });

program
  .command('presets')
  .description('Show available presets')
  .action(() => {
    const presets = listPresets();
    
    console.log(chalk.bold.blue('=== AVAILABLE PRESETS ==='));
    console.log('');
    
    presets.forEach(preset => {
      console.log(chalk.bold.green(`${preset.name}:`));
      console.log(`  ${preset.description}`);
      console.log(`  Parameters: ${JSON.stringify(preset.parameters, null, 2)}`);
      console.log('');
    });
  });

program
  .command('check-libreoffice')
  .description('Check LibreOffice installation')
  .action(async () => {
    const detector = LibreOfficeDetector.getInstance();
    const info = await detector.detectLibreOffice();
    
    console.log(chalk.bold.blue('=== LIBREOFFICE STATUS ==='));
    console.log('');
    
    if (info.found) {
      console.log(chalk.green('✅ LibreOffice found'));
      console.log(`   Location: ${info.path}`);
      if (info.version) {
        console.log(`   Version: ${info.version}`);
      }
    } else {
      console.log(chalk.red('❌ LibreOffice not found'));
      if (info.error) {
        console.log(`   Error: ${info.error}`);
      }
    }
    console.log('');
  });

program
  .command('check-pdf-tools')
  .description('Check PDF tools (Ghostscript and qpdf)')
  .action(async () => {
    const detector = PdfToolsDetector.getInstance();
    const info = await detector.detectPdfTools();
    
    console.log(chalk.bold.blue('=== PDF TOOLS STATUS ==='));
    console.log('');
    
    // Ghostscript
    if (info.ghostscript.found) {
      console.log(chalk.green('✅ Ghostscript found'));
      console.log(`   Location: ${info.ghostscript.path}`);
      if (info.ghostscript.version) {
        console.log(`   Version: ${info.ghostscript.version}`);
      }
    } else {
      console.log(chalk.red('❌ Ghostscript not found'));
      if (info.ghostscript.error) {
        console.log(`   Error: ${info.ghostscript.error}`);
      }
    }
    console.log('');
    
    // qpdf
    if (info.qpdf.found) {
      console.log(chalk.green('✅ qpdf found'));
      console.log(`   Location: ${info.qpdf.path}`);
      if (info.qpdf.version) {
        console.log(`   Version: ${info.qpdf.version}`);
      }
    } else {
      console.log(chalk.red('❌ qpdf not found'));
      if (info.qpdf.error) {
        console.log(`   Error: ${info.qpdf.error}`);
      }
    }
    console.log('');
  });

program
  .command('check-pandoc')
  .description('Check Pandoc and LaTeX')
  .action(async () => {
    const detector = PandocDetector.getInstance();
    const info = await detector.detectPandocTools();
    
    console.log(chalk.bold.blue('=== PANDOC STATUS ==='));
    console.log('');
    
    // Pandoc
    if (info.pandoc.found) {
      console.log(chalk.green('✅ Pandoc found'));
      console.log(`   Location: ${info.pandoc.path}`);
      if (info.pandoc.version) {
        console.log(`   Version: ${info.pandoc.version}`);
      }
    } else {
      console.log(chalk.red('❌ Pandoc not found'));
      if (info.pandoc.error) {
        console.log(`   Error: ${info.pandoc.error}`);
      }
    }
    console.log('');
    
    // LaTeX
    if (info.latex.found) {
      console.log(chalk.green('✅ LaTeX found'));
      console.log(`   Location: ${info.latex.path}`);
      if (info.latex.version) {
        console.log(`   Version: ${info.latex.version}`);
      }
      if (info.latex.distribution) {
        console.log(`   Distribution: ${info.latex.distribution}`);
      }
    } else {
      console.log(chalk.yellow('⚠️  LaTeX not found (optional for higher PDF quality)'));
      if (info.latex.error) {
        console.log(`   Error: ${info.latex.error}`);
      }
    }
    console.log('');
  });

program
  .command('check-ocr')
  .description('Check OCR tools (ocrmypdf and Tesseract)')
  .action(async () => {
    const detector = OcrDetector.getInstance();
    const info = await detector.detectOcrTools();
    
    console.log(chalk.bold.blue('=== OCR STATUS ==='));
    console.log('');
    
    // ocrmypdf
    if (info.ocrmypdf.found) {
      console.log(chalk.green('✅ ocrmypdf found'));
      console.log(`   Location: ${info.ocrmypdf.path}`);
      if (info.ocrmypdf.version) {
        console.log(`   Version: ${info.ocrmypdf.version}`);
      }
    } else {
      console.log(chalk.red('❌ ocrmypdf not found'));
      if (info.ocrmypdf.error) {
        console.log(`   Error: ${info.ocrmypdf.error}`);
      }
    }
    console.log('');
    
    // Tesseract
    if (info.tesseract.found) {
      console.log(chalk.green('✅ Tesseract found'));
      console.log(`   Location: ${info.tesseract.path}`);
      if (info.tesseract.version) {
        console.log(`   Version: ${info.tesseract.version}`);
      }
    } else {
      console.log(chalk.red('❌ Tesseract not found'));
      if (info.tesseract.error) {
        console.log(`   Error: ${info.tesseract.error}`);
      }
    }
    console.log('');
    
    // Languages
    if (info.languages.length > 0) {
      console.log(chalk.green('✅ Tesseract languages available:'));
      console.log(`   ${info.languages.slice(0, 10).join(', ')}${info.languages.length > 10 ? '...' : ''}`);
      console.log(`   Total: ${info.languages.length} languages`);
    } else {
      console.log(chalk.yellow('⚠️  No Tesseract languages found'));
    }
    console.log('');
  });

program
  .command('preset')
  .description('Preset operations')
  .addCommand(
    new Command('list')
      .description('List all available presets')
      .action(async () => {
        try {
          const configManager = ConfigManager.getInstance();
          const presets = await configManager.listPresets();
          
          console.log(chalk.bold.blue('=== AVAILABLE PRESETS ==='));
          console.log('');
          
          // Group by scope
          const builtin = presets.filter(p => p.scope === 'builtin');
          const global = presets.filter(p => p.scope === 'global');
          const local = presets.filter(p => p.scope === 'local');
          
          if (builtin.length > 0) {
            console.log(chalk.bold.green('🔧 Built-in presets:'));
            builtin.forEach(preset => {
              console.log(`  ${chalk.cyan(preset.name)} - ${preset.description}`);
              console.log(`    Type: ${preset.type}, Parameters: ${JSON.stringify(preset.parameters)}`);
            });
            console.log('');
          }
          
          if (global.length > 0) {
            console.log(chalk.bold.green('👤 User presets (global):'));
            global.forEach(preset => {
              console.log(`  ${chalk.cyan(preset.name)} - ${preset.description}`);
              console.log(`    Type: ${preset.type}, Parameters: ${JSON.stringify(preset.parameters)}`);
            });
            console.log('');
          }
          
          if (local.length > 0) {
            console.log(chalk.bold.green('📁 Project presets (local):'));
            local.forEach(preset => {
              console.log(`  ${chalk.cyan(preset.name)} - ${preset.description}`);
              console.log(`    Type: ${preset.type}, Parameters: ${JSON.stringify(preset.parameters)}`);
            });
            console.log('');
          }
          
          if (presets.length === 0) {
            console.log(chalk.yellow('No presets found.'));
          }
          
        } catch (error) {
          logger.error('Error listing presets', { error });
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('create')
      .description('Create a new preset')
      .requiredOption('-n, --name <name>', 'Preset name')
      .requiredOption('-d, --description <description>', 'Preset description')
      .requiredOption('-t, --type <type>', 'Preset type (image|pdf|document)')
      .requiredOption('-p, --parameters <parameters>', 'Preset parameters (format: key1=value1;key2=value2)')
      .option('-s, --scope <scope>', 'Preset scope (global|local)', 'local')
      .action(async (options) => {
        try {
          const configManager = ConfigManager.getInstance();
          
          // Parse parameters
          const parameters = configManager.parsePresetParameters(options.parameters);
          
          // Validate parameters
          if (!configManager.validatePresetParameters(options.type, parameters)) {
            throw new Error(`Invalid parameters for type '${options.type}'`);
          }
          
          await configManager.createPreset(
            options.name,
            options.description,
            options.type as 'image' | 'pdf' | 'document',
            parameters,
            options.scope as 'global' | 'local'
          );
          
          console.log(chalk.green(`✅ Preset '${options.name}' created!`));
          console.log(`   Type: ${options.type}`);
          console.log(`   Scope: ${options.scope}`);
          console.log(`   Parameters: ${JSON.stringify(parameters)}`);
          
        } catch (error) {
          logger.error('Error creating preset', { error });
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete a preset')
      .requiredOption('-n, --name <name>', 'Preset name')
      .option('-s, --scope <scope>', 'Preset scope (global|local)', 'local')
      .action(async (options) => {
        try {
          const configManager = ConfigManager.getInstance();
          
          const deleted = await configManager.deletePreset(
            options.name,
            options.scope as 'global' | 'local'
          );
          
          if (deleted) {
            console.log(chalk.green(`✅ Preset '${options.name}' deleted!`));
          } else {
            console.log(chalk.yellow(`⚠️  Preset '${options.name}' not found in scope '${options.scope}'`));
          }
          
        } catch (error) {
          logger.error('Error deleting preset', { error });
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      })
  );

program
  .command('pdf-presets')
  .description('Show available PDF presets')
  .action(() => {
    const presets = listPdfPresets();
    
    console.log(chalk.bold.blue('=== AVAILABLE PDF PRESETS ==='));
    console.log('');
    
    presets.forEach(preset => {
      console.log(chalk.bold.green(`${preset.name}:`));
      console.log(`  ${preset.description}`);
      console.log(`  PDFSETTINGS: ${preset.ghostscriptSettings.dPDFSETTINGS}`);
      console.log(`  Compatibility: ${preset.ghostscriptSettings.dCompatibilityLevel}`);
      console.log(`  Resolution: ${preset.ghostscriptSettings.dColorImageResolution} dpi`);
      console.log('');
    });
  });

program
  .command('version')
  .description('Show version and system information')
  .action(() => {
    console.log(chalk.bold.blue('=== FILECONVERTER VERSION ==='));
    console.log(`Version: ${program.version()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Working directory: ${process.cwd()}`);
  });

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  logger.error('Unexpected error', { error });
  console.error(chalk.red('Critical error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unexpected promise rejection', { reason, promise });
  console.error(chalk.red('Promise rejection:'), reason);
  process.exit(1);
});

// Start CLI
if (require.main === module) {
  program.parse();
}
