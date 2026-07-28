import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { ConversionResult, JobLog, JobLogReportOptions } from './types';

function formatTextReport(result: ConversionResult, jobLogs: JobLog[]): string {
  const summary = [
    '=== CONVERSION JOB LOG ===',
    `Total jobs: ${result.totalJobs}`,
    `Successful jobs: ${result.successfulJobs}`,
    `Failed jobs: ${result.failedJobs}`,
    `Total duration: ${result.totalDuration}ms`,
  ];
  const jobs = jobLogs.flatMap((job, index) => [
    '',
    `Job ${index + 1}: ${job.jobId}`,
    `Input: ${job.inputPath}`,
    `Output: ${job.outputPath}`,
    `Status: ${job.success ? 'success' : 'failed'}`,
    `Duration: ${job.duration}ms`,
    ...(job.error ? [`Error: ${job.error}`] : []),
  ]);

  return [...summary, ...jobs, ''].join('\n');
}

async function writeReport(filePath: string, content: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);

  try {
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, content, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not write job log report to ${resolvedPath}: ${reason}`, { cause: error });
  }
}

export async function writeJobLogReports(
  options: JobLogReportOptions,
  result: ConversionResult,
  jobLogs: JobLog[]
): Promise<void> {
  const report = {
    totalJobs: result.totalJobs,
    successfulJobs: result.successfulJobs,
    failedJobs: result.failedJobs,
    totalDuration: result.totalDuration,
    jobs: jobLogs,
  };
  const writes: Promise<void>[] = [];

  if (options.jsonPath) {
    writes.push(writeReport(options.jsonPath, JSON.stringify(report, null, 2)));
  }
  if (options.textPath) {
    writes.push(writeReport(options.textPath, formatTextReport(result, jobLogs)));
  }

  await Promise.all(writes);
}