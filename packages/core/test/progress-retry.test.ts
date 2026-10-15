import { vi } from 'vitest';
import cliProgress from 'cli-progress';
import { ProgressTracker } from '../src/progress';
import { JobQueue } from '../src/job-queue';

vi.mock('cli-progress', () => ({ default: { SingleBar: vi.fn(function () {
  return { start: vi.fn(), update: vi.fn(), stop: vi.fn() };
}) } }));
vi.mock('../src/adapters/adapter-manager', () => ({ AdapterManager: class {
  async convert() { return { success: false, error: 'decode failed' }; }
  getAdapter() { return { name: 'test' }; }
} }));

it('tracks active jobs correctly across retries and finishes at zero', async () => {
  const tracker = new ProgressTracker();
  const queue = new JobQueue(1);
  tracker.start(1);
  for (const event of ['jobStarted', 'jobRetry', 'jobCompleted', 'jobFailed']) {
    queue.on(event, job => tracker.updateJobStatus(job));
  }
  await queue.addJob({ inputPath: 'input.heic', outputPath: 'output.jpg',
    inputFormat: 'heic', outputFormat: 'jpg', supported: true }, 2);
  const result = await queue.waitForCompletion();
  tracker.stop();
  expect(result.failedJobs).toBe(1);
  const bar = vi.mocked(cliProgress.SingleBar).mock.results[0].value;
  expect(bar.start).toHaveBeenCalledWith(1, 0, { successful: 0, failed: 0, running: 0 });
  expect(bar.update.mock.calls.map((call: any[]) => call[1].running)).toEqual([1, 0, 1, 0, 1, 0]);
  expect(bar.update).toHaveBeenLastCalledWith(1, expect.objectContaining({ failed: 1, running: 0 }));
});
