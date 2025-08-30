export interface ConversionPlan {
  inputPath: string;
  outputPath: string;
  inputFormat: string;
  outputFormat: string;
  supported: boolean;
  reason?: string;
}

export interface ConversionOptions {
  input: string;
  output: string;
  format: string;
  recursive?: boolean;
  dryRun?: boolean;
  concurrency?: number;
  retries?: number;
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
}

export interface ConversionJob {
  id: string;
  plan: ConversionPlan;
  status: JobStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export type JobStatus = 'queued' | 'running' | 'success' | 'failed';

export interface ConversionResult {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalDuration: number;
  jobs: ConversionJob[];
}

export interface JobLog {
  jobId: string;
  inputPath: string;
  outputPath: string;
  engine: string;
  parameters: Record<string, any>;
  startTime: string;
  endTime: string;
  duration: number;
  exitCode: number;
  success: boolean;
  error?: string;
}

export interface FileTypeInfo {
  ext: string;
  mime: string;
  supported: boolean;
}

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
