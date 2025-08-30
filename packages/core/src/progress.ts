import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { ConversionJob, JobStatus } from './types';

export class ProgressTracker {
  private progressBar: cliProgress.SingleBar;
  private totalJobs: number = 0;
  private completedJobs: number = 0;
  private successfulJobs: number = 0;
  private failedJobs: number = 0;
  private runningJobs: number = 0;

  constructor() {
    this.progressBar = new cliProgress.SingleBar({
      format: this.getProgressFormat(),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
  }

  start(totalJobs: number): void {
    this.totalJobs = totalJobs;
    this.completedJobs = 0;
    this.successfulJobs = 0;
    this.failedJobs = 0;
    this.runningJobs = 0;

    console.log(chalk.blue(`\n🚀 Starter konvertering av ${totalJobs} filer...\n`));
    this.progressBar.start(totalJobs, 0);
  }

  updateJobStatus(job: ConversionJob): void {
    switch (job.status) {
      case 'running':
        this.runningJobs++;
        break;
      case 'success':
        this.completedJobs++;
        this.successfulJobs++;
        this.runningJobs = Math.max(0, this.runningJobs - 1);
        break;
      case 'failed':
        this.completedJobs++;
        this.failedJobs++;
        this.runningJobs = Math.max(0, this.runningJobs - 1);
        break;
    }

    this.progressBar.update(this.completedJobs, {
      completed: this.completedJobs,
      total: this.totalJobs,
      successful: this.successfulJobs,
      failed: this.failedJobs,
      running: this.runningJobs
    });
  }

  stop(): void {
    this.progressBar.stop();
  }

  private getProgressFormat(): string {
    return [
      chalk.cyan('{bar}'),
      chalk.gray('|'),
      chalk.yellow('{percentage}%'),
      chalk.gray('|'),
      chalk.green('✓ {successful}'),
      chalk.gray('|'),
      chalk.red('✗ {failed}'),
      chalk.gray('|'),
      chalk.blue('🔄 {running}'),
      chalk.gray('|'),
      chalk.white('{value}/{total}')
    ].join(' ');
  }

  displaySummary(result: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalDuration: number;
  }): void {
    const { totalJobs, successfulJobs, failedJobs, totalDuration } = result;
    
    console.log('\n' + chalk.bold.blue('=== KONVERTERINGS SAMMENDRAG ==='));
    console.log(`Totalt antall filer: ${chalk.bold(totalJobs)}`);
    console.log(`Vellykket: ${chalk.green.bold(successfulJobs)}`);
    console.log(`Feilet: ${chalk.red.bold(failedJobs)}`);
    console.log(`Total tid: ${chalk.blue.bold(this.formatDuration(totalDuration))}`);
    
    if (failedJobs > 0) {
      console.log(chalk.yellow(`\n⚠️  ${failedJobs} filer feilet. Sjekk loggene for detaljer.`));
    } else {
      console.log(chalk.green('\n🎉 Alle filer ble konvertert vellykket!'));
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}t ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
