# Log File Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional JSON and readable text conversion job reports through `--log-file-json` and `--log-file-txt`.

**Architecture:** A focused `job-log-writer` module serializes completed `JobLog` records and a `ConversionResult` to files. `Converter` invokes it after the job queue finishes, while `cli.ts` only parses and forwards the two paths. This keeps the existing Winston application logs independent from user-requested conversion reports.

**Tech Stack:** TypeScript, Node.js `fs/promises`, Commander, Vitest.

## Global Constraints

- Preserve current conversion behavior when neither output flag is provided.
- Support each output flag independently and together.
- Resolve paths from the invoking working directory and create parent directories.
- Throw an error naming an unwritable requested path.
- Do not add a dependency or change the global Winston logger.

---

### Task 1: Add a Focused Job Report Writer

**Files:**

- Create: `packages/core/src/job-log-writer.ts`
- Create: `packages/core/test/job-log-writer.test.ts`
- Modify: `packages/core/src/types.ts`

**Interfaces:**

- Consumes: `ConversionResult` and `JobLog` from `src/types.ts`.
- Produces: `writeJobLogReports(options: JobLogReportOptions, result: ConversionResult, jobLogs: JobLog[]): Promise<void>`.
- Produces: `JobLogReportOptions` with optional `jsonPath` and `textPath` fields.

- [ ] **Step 1: Write the failing JSON-only test**

```ts
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
```

- [ ] **Step 2: Run the JSON test to verify it fails**

Run: `npm.cmd test -w @fileconverter/core -- test/job-log-writer.test.ts`

Expected: FAIL because `job-log-writer` and `writeJobLogReports` do not exist.

- [ ] **Step 3: Define the report options and implement JSON output**

```ts
export interface JobLogReportOptions {
  jsonPath?: string;
  textPath?: string;
}

export async function writeJobLogReports(
  options: JobLogReportOptions,
  result: ConversionResult,
  jobLogs: JobLog[]
): Promise<void> {
  if (options.jsonPath) {
    const jsonPath = path.resolve(options.jsonPath);
    await fs.mkdir(path.dirname(jsonPath), { recursive: true });
    await fs.writeFile(jsonPath, JSON.stringify({ ...result, jobs: jobLogs }, null, 2));
  }
}
```

- [ ] **Step 4: Run the JSON test to verify it passes**

Run: `npm.cmd test -w @fileconverter/core -- test/job-log-writer.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing text-only test**

```ts
it('writes a readable text report when textPath is supplied', async () => {
  const textPath = path.join(testDir, 'reports', 'jobs.txt');

  await writeJobLogReports({ textPath }, result, jobLogs);

  await expect(fs.promises.readFile(textPath, 'utf8')).resolves.toContain('Successful jobs: 1');
  await expect(fs.promises.readFile(textPath, 'utf8')).resolves.toContain('Input: input.md');
  await expect(fs.promises.readFile(textPath, 'utf8')).resolves.toContain('Status: success');
});
```

- [ ] **Step 6: Run the text test to verify it fails**

Run: `npm.cmd test -w @fileconverter/core -- test/job-log-writer.test.ts`

Expected: FAIL because `textPath` has no writer implementation.

- [ ] **Step 7: Implement a deterministic text formatter**

```ts
function formatTextReport(result: ConversionResult, jobLogs: JobLog[]): string {
  const summary = [
    '=== CONVERSION JOB LOG ===',
    `Total jobs: ${result.totalJobs}`,
    `Successful jobs: ${result.successfulJobs}`,
    `Failed jobs: ${result.failedJobs}`,
    `Total duration: ${result.totalDuration}ms`,
  ];
  const jobs = jobLogs.flatMap((job, index) => [
    '', `Job ${index + 1}: ${job.jobId}`, `Input: ${job.inputPath}`,
    `Output: ${job.outputPath}`, `Status: ${job.success ? 'success' : 'failed'}`,
    `Duration: ${job.duration}ms`, ...(job.error ? [`Error: ${job.error}`] : []),
  ]);
  return [...summary, ...jobs, ''].join('\n');
}
```

- [ ] **Step 8: Run the writer tests to verify they pass**

Run: `npm.cmd test -w @fileconverter/core -- test/job-log-writer.test.ts`

Expected: PASS.

- [ ] **Step 9: Write failing both-paths and write-error tests**

```ts
it('writes JSON and text reports when both paths are supplied', async () => {
  await writeJobLogReports({ jsonPath, textPath }, result, jobLogs);
  await expect(fs.promises.stat(jsonPath)).resolves.toBeDefined();
  await expect(fs.promises.stat(textPath)).resolves.toBeDefined();
});

it('names the requested path when a report cannot be written', async () => {
  await expect(writeJobLogReports({ jsonPath: invalidPath }, result, jobLogs))
    .rejects.toThrow(invalidPath);
});
```

- [ ] **Step 10: Run the added tests to verify they fail**

Run: `npm.cmd test -w @fileconverter/core -- test/job-log-writer.test.ts`

Expected: FAIL because errors are currently propagated without requested-path context.

- [ ] **Step 11: Add contextual write errors and dual-format output**

```ts
async function writeReport(filePath: string, content: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  try {
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, 'utf8');
  } catch (error) {
    throw new Error(`Could not write job log report to ${resolvedPath}: ${error instanceof Error ? error.message : error}`);
  }
}

await Promise.all([
  options.jsonPath && writeReport(options.jsonPath, JSON.stringify(report, null, 2)),
  options.textPath && writeReport(options.textPath, formatTextReport(result, jobLogs)),
].filter(Boolean));
```

- [ ] **Step 12: Run the complete writer test file**

Run: `npm.cmd test -w @fileconverter/core -- test/job-log-writer.test.ts`

Expected: PASS.

- [ ] **Step 13: Commit the report writer**

```bash
git add packages/core/src/types.ts packages/core/src/job-log-writer.ts packages/core/test/job-log-writer.test.ts
git commit -m "feat: add conversion job log writer"
```

### Task 2: Wire Report Paths Through the Converter and CLI

**Files:**

- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/converter.ts`
- Modify: `packages/core/src/cli.ts`
- Modify: `packages/core/test/integration/converter.test.ts`

**Interfaces:**

- Consumes: `JobLogReportOptions` and `writeJobLogReports` from `src/job-log-writer.ts`.
- Produces: `ConversionOptions.logFileJson?: string` and `ConversionOptions.logFileTxt?: string`.
- Produces: `converter convert --log-file-json <path> --log-file-txt <path>`.

- [ ] **Step 1: Write the failing converter integration test**

```ts
it('writes requested job reports after a completed conversion', async () => {
  const jsonPath = path.join(testOutputDir, 'reports', 'jobs.json');
  const textPath = path.join(testOutputDir, 'reports', 'jobs.txt');
  createTestFiles();

  await converter.convert({
    input: testInputDir, output: testOutputDir, format: 'html',
    logFileJson: jsonPath, logFileTxt: textPath,
  });

  expect(fs.existsSync(jsonPath)).toBe(true);
  expect(fs.existsSync(textPath)).toBe(true);
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `npm.cmd test -w @fileconverter/core -- test/integration/converter.test.ts`

Expected: FAIL because `ConversionOptions` has no report paths and `Converter` never invokes the writer.

- [ ] **Step 3: Pass report paths to `processJobs` and invoke the writer after completion**

```ts
const reportOptions = { jsonPath: options.logFileJson, textPath: options.logFileTxt };
return this.processJobs(supportedPlans, concurrency, retries, finalParameters, reportOptions);

const result = await jobQueue.waitForCompletion();
const jobLogs = jobQueue.getJobLogs();
await writeJobLogReports(reportOptions, result, jobLogs);
this.logJobResults(jobLogs);
return result;
```

- [ ] **Step 4: Run the integration test to verify it passes**

Run: `npm.cmd test -w @fileconverter/core -- test/integration/converter.test.ts`

Expected: PASS.

- [ ] **Step 5: Add the two Commander options and forward them**

```ts
.option('--log-file-json <path>', 'Save conversion job logs as JSON')
.option('--log-file-txt <path>', 'Save conversion job logs as readable text')

logFileJson: options.logFileJson,
logFileTxt: options.logFileTxt,
```

- [ ] **Step 6: Build the core CLI and inspect help output**

Run: `npm.cmd run build -w @fileconverter/core; node packages/core/dist/cli.js convert --help`

Expected: build succeeds and help includes both report options.

- [ ] **Step 7: Commit the CLI wiring**

```bash
git add packages/core/src/types.ts packages/core/src/converter.ts packages/core/src/cli.ts packages/core/test/integration/converter.test.ts
git commit -m "feat: add CLI job log output flags"
```

### Task 3: Verify the Completed Feature

**Files:**

- Modify: `README.md` only if command options are documented there.

**Interfaces:**

- Consumes: completed CLI behavior from Task 2.
- Produces: documented and verified issue #22 implementation.

- [ ] **Step 1: Check whether the README documents `converter convert` options**

Run: `rg -n "converter convert|--dry-run|--concurrency" README.md packages/core/README.md`

Expected: identify the existing CLI command reference, if any.

- [ ] **Step 2: Add the new flags to the existing CLI command reference when present**

```md
--log-file-json logs/conversion.json
--log-file-txt logs/conversion.txt
```

- [ ] **Step 3: Run focused and full verification**

Run: `npm.cmd test -w @fileconverter/core; npm.cmd run lint -w @fileconverter/core; npm.cmd run build -w @fileconverter/core; npm.cmd audit --workspaces`

Expected: tests, lint, and build pass; audit reports zero vulnerabilities.

- [ ] **Step 4: Commit documentation and any final test adjustments**

```bash
git add README.md packages/core
git commit -m "docs: document conversion job log outputs"
```

