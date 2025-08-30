import { BaseAdapter, ConversionParameters, ConversionResult } from './base-adapter';
import { ConversionPlan } from '../types';
import { SharpAdapter } from './images/sharp-adapter';
import { ImageMagickAdapter } from './images/imagemagick-adapter';
import { LibreOfficeAdapter } from './office/libreoffice-adapter';
import { LibreOfficeOfficeAdapter } from './office/libreoffice-office-adapter';
import { PdfAdapter } from './pdf/pdf-adapter';
import { PandocAdapter } from './document/pandoc-adapter';
import { OcrAdapter } from './ocr/ocr-adapter';
import logger from '../logger';

export class AdapterManager {
  private adapters: BaseAdapter[] = [];

  constructor() {
    // Registrer tilgjengelige adapters
    // ImageMagick først for HEIC-støtte på Windows
    this.registerAdapter(new ImageMagickAdapter());
    this.registerAdapter(new SharpAdapter());
    this.registerAdapter(new LibreOfficeAdapter());
    this.registerAdapter(new LibreOfficeOfficeAdapter());
    this.registerAdapter(new PdfAdapter());
    this.registerAdapter(new PandocAdapter());
    this.registerAdapter(new OcrAdapter());
  }

  registerAdapter(adapter: BaseAdapter): void {
    this.adapters.push(adapter);
    logger.debug(`Registrert adapter: ${adapter.name}`);
  }

  getAdapter(inputFormat: string, outputFormat: string): BaseAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(inputFormat, outputFormat)) {
        return adapter;
      }
    }
    return null;
  }

  async convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const adapter = this.getAdapter(plan.inputFormat, plan.outputFormat);
    
    if (!adapter) {
      const error = `Ingen adapter funnet for konvertering fra ${plan.inputFormat} til ${plan.outputFormat}`;
      logger.error(error);
      return {
        success: false,
        outputPath: plan.outputPath,
        duration: 0,
        error
      };
    }

    logger.info(`Bruker adapter: ${adapter.name}`, {
      inputFormat: plan.inputFormat,
      outputFormat: plan.outputFormat
    });

    return await adapter.convert(plan, parameters);
  }

  getSupportedConversions(): Array<{
    inputFormat: string;
    outputFormat: string;
    adapter: string;
  }> {
    const conversions: Array<{
      inputFormat: string;
      outputFormat: string;
      adapter: string;
    }> = [];

    for (const adapter of this.adapters) {
      for (const inputFormat of adapter.supportedInputFormats) {
        for (const outputFormat of adapter.supportedOutputFormats) {
          if (inputFormat !== outputFormat) {
            conversions.push({
              inputFormat,
              outputFormat,
              adapter: adapter.name
            });
          }
        }
      }
    }

    return conversions;
  }

  listAdapters(): Array<{
    name: string;
    supportedInputFormats: string[];
    supportedOutputFormats: string[];
  }> {
    return this.adapters.map(adapter => ({
      name: adapter.name,
      supportedInputFormats: adapter.supportedInputFormats,
      supportedOutputFormats: adapter.supportedOutputFormats
    }));
  }
}
