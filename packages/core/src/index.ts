export { Converter } from './converter';
export { detectFileType, isSupportedFormat, getSupportedFormats } from './file-detector';
export { scanForFiles } from './file-scanner';
export { JobQueue } from './job-queue';
export { ProgressTracker } from './progress';
export { AdapterManager } from './adapters/adapter-manager';
export { SharpAdapter } from './adapters/images/sharp-adapter';
export { PdfAdapter } from './adapters/pdf/pdf-adapter';
export { DocumentAdapter } from './adapters/document/document-adapter';
export { OcrAdapter } from './adapters/ocr/ocr-adapter';
export { ConfigManager } from './config/config-manager';
export { listPresets, getPreset } from './presets/image-presets';
export { logger } from './logger';

export type {
  ConversionPlan,
  ConversionOptions,
  ConversionJob,
  JobStatus,
  ConversionResult,
  JobLog,
  FileTypeInfo,
  Logger,
} from './types';

export type {
  ConversionParameters,
  ConversionResult as AdapterConversionResult,
} from './adapters/base-adapter';

export type { Preset, ConverterConfig } from './config/config-manager';
