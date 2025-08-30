import { ConversionPlan } from '../types';

export interface ConversionParameters {
  quality?: number | string; // number for bilde, string for OCR (fast/standard/high)
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata?: boolean;
  preset?: string;
  // PDF-operasjoner
  operation?: 'compress' | 'merge' | 'split';
  inputFiles?: string[];
  pages?: string;
  // OCR-operasjoner
  language?: string;
  [key: string]: any;
}

export interface ConversionResult {
  success: boolean;
  outputPath: string;
  duration: number;
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    format?: string;
    // PDF-spesifikke felter
    originalSize?: number;
    compressionRatio?: string;
    preset?: string;
    mergedFiles?: number;
    pages?: string;
    // Pandoc-spesifikke felter
    engine?: string;
    warning?: string;
    // OCR-spesifikke felter
    searchable?: boolean;
    characters?: number;
  };
}

export abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly supportedInputFormats: string[];
  abstract readonly supportedOutputFormats: string[];

  abstract convert(
    plan: ConversionPlan,
    parameters: ConversionParameters
  ): Promise<ConversionResult>;

  canHandle(inputFormat: string, outputFormat: string): boolean {
    return (
      this.supportedInputFormats.includes(inputFormat.toLowerCase()) &&
      this.supportedOutputFormats.includes(outputFormat.toLowerCase())
    );
  }

  validateParameters(parameters: ConversionParameters): void {
    // Base implementation - subclasses can override
    if (parameters.quality !== undefined) {
      if (typeof parameters.quality === 'number' && (parameters.quality < 1 || parameters.quality > 100)) {
        throw new Error('Quality must be between 1 and 100');
      }
      if (typeof parameters.quality === 'string' && !['fast', 'standard', 'high'].includes(parameters.quality)) {
        throw new Error('Quality must be fast, standard, or high for OCR operations');
      }
    }
    
    if (parameters.maxWidth !== undefined && parameters.maxWidth <= 0) {
      throw new Error('Max width must be positive');
    }
    
    if (parameters.maxHeight !== undefined && parameters.maxHeight <= 0) {
      throw new Error('Max height must be positive');
    }
  }
}
