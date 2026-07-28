import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeJobLogReports } from '../src/job-log-writer';
import { ConversionResult, JobLog } from '../src/types';

describe('writeJobLogReports', () => {
  let testDir: string;

  const jobLogs: JobLog[] = [{
    jobId: 'job-1',
    inputPath: 'input.md',
    outputPath: 'output.html',
    engine: 'document',
    parameters: { format: 'html' },
    startTime: '2026-07-28T12:00:00.000Z',
    endTime: '2026-07-28T12:00:00.025Z',
    duration: 25,
    exitCode: 0,
    success: true,
  }];

  const result: ConversionResult = {
    totalJobs: 1,
    successfulJobs: 1,
    failedJobs: 0,
    totalDuration: 25,
    jobs: [],
  };

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileconverter-job-log-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('writes a structured JSON report when jsonPath is supplied', async () => {
    const jsonPath = path.join(testDir, 'reports', 'jobs.json');

    await writeJobLogReports({ jsonPath }, result, jobLogs);

    expect(JSON.parse(await fs.promises.readFile(jsonPath, 'utf8'))).toEqual({
      totalJobs: 1,
      successfulJobs: 1,
      failedJobs: 0,
      totalDuration: 25,
      jobs: jobLogs,
    });
  });

  it('writes a readable text report when textPath is supplied', async () => {
    const textPath = path.join(testDir, 'reports', 'jobs.txt');

    await writeJobLogReports({ textPath }, result, jobLogs);

    const report = await fs.promises.readFile(textPath, 'utf8');
    expect(report).toContain('Successful jobs: 1');
    expect(report).toContain('Input: input.md');
    expect(report).toContain('Status: success');
  });
  it('writes JSON and text reports when both paths are supplied', async () => {
    const jsonPath = path.join(testDir, 'reports', 'jobs.json');
    const textPath = path.join(testDir, 'reports', 'jobs.txt');

    await writeJobLogReports({ jsonPath, textPath }, result, jobLogs);

    await expect(fs.promises.stat(jsonPath)).resolves.toBeDefined();
    await expect(fs.promises.stat(textPath)).resolves.toBeDefined();
  });

  it('names the requested path when a report cannot be written', async () => {
    const blockedPath = path.join(testDir, 'blocked');
    const invalidPath = path.join(blockedPath, 'jobs.json');
    fs.writeFileSync(blockedPath, 'not a directory');

    await expect(writeJobLogReports({ jsonPath: invalidPath }, result, jobLogs))
      .rejects.toThrow(invalidPath);
  });
});