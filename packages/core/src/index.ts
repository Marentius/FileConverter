// Hovedeksporter for core-pakken
export { Converter } from './converter';
export { detectFileType, isSupportedFormat, getSupportedFormats } from './file-detector';
export { scanForFiles } from './file-scanner';
export { JobQueue } from './job-queue';
export { ProgressTracker } from './progress';
export { AdapterManager } from './adapters/adapter-manager';
export { SharpAdapter } from './adapters/images/sharp-adapter';
export { LibreOfficeAdapter } from './adapters/office/libreoffice-adapter';
export { LibreOfficeOfficeAdapter } from './adapters/office/libreoffice-office-adapter';
export { PdfAdapter } from './adapters/pdf/pdf-adapter';
export { PandocAdapter } from './adapters/document/pandoc-adapter';
export { OcrAdapter } from './adapters/ocr/ocr-adapter';
export { LibreOfficeDetector } from './utils/libreoffice-detector';
export { PdfToolsDetector } from './utils/pdf-tools-detector';
export { PandocDetector } from './utils/pandoc-detector';
export { OcrDetector } from './utils/ocr-detector';
export { ConfigManager } from './config/config-manager';
export { listPresets, getPreset } from './presets/image-presets';
export { listPdfPresets, getPdfPreset } from './presets/pdf-presets';
export { logger } from './logger';

// Typer
export type {
  ConversionPlan,
  ConversionOptions,
  ConversionJob,
  JobStatus,
  ConversionResult,
  JobLog,
  FileTypeInfo,
  Logger
} from './types';

// Adapter typer
export type {
  ConversionParameters,
  ConversionResult as AdapterConversionResult
} from './adapters/base-adapter';

// Utility typer
export type { LibreOfficeInfo } from './utils/libreoffice-detector';
export type { PdfToolInfo, PdfToolsInfo } from './utils/pdf-tools-detector';
export type { PandocInfo, LaTeXInfo, PandocToolsInfo } from './utils/pandoc-detector';
export type { OcrToolInfo, OcrToolsInfo } from './utils/ocr-detector';
export type { Preset, ConverterConfig } from './config/config-manager';
export type { PdfPreset } from './presets/pdf-presets';
export type { PdfOperation } from './adapters/pdf/pdf-adapter';
