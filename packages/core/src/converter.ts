import path from 'path';
import fs from 'fs';
import { scanForFiles } from './file-scanner';
import { ConversionPlan, ConversionOptions, ConversionResult } from './types';
import { JobQueue } from './job-queue';
import { ProgressTracker } from './progress';
import { ConversionParameters } from './adapters/base-adapter';
import { ConfigManager } from './config/config-manager';
import logger from './logger';
import chalk from 'chalk';

export class Converter {
  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const { 
      input, 
      output, 
      format, 
      recursive = false, 
      dryRun = false,
      concurrency = 1,
      retries = 2,
      quality,
      maxWidth,
      maxHeight,
      stripMetadata,
      preset,
      operation,
      inputFiles,
      pages
    } = options;
    
    logger.info('Starter filkonvertering', { 
      input, 
      output, 
      format, 
      recursive, 
      dryRun,
      concurrency,
      retries
    });
    
    try {
      // Opprett output-mappe hvis den ikke eksisterer
      if (!fs.existsSync(output)) {
        fs.mkdirSync(output, { recursive: true });
        logger.info(`Opprettet output-mappe: ${output}`);
      }
      
      // Skann for filer og lag konverteringsplan
      const plans = await scanForFiles(input, output, format, recursive);
      
      if (plans.length === 0) {
        logger.warn('Ingen filer funnet for konvertering');
        return {
          totalJobs: 0,
          successfulJobs: 0,
          failedJobs: 0,
          totalDuration: 0,
          jobs: []
        };
      }
      
      // Analyser planer
      const supportedPlans = plans.filter(p => p.supported);
      const unsupportedPlans = plans.filter(p => !p.supported);
      
      // Vis sammendrag
      this.displaySummary(plans, supportedPlans, unsupportedPlans, dryRun);
      
      if (dryRun) {
        // Vis detaljert plan for dry-run
        this.displayDetailedPlan(plans);
        return {
          totalJobs: plans.length,
          successfulJobs: supportedPlans.length,
          failedJobs: unsupportedPlans.length,
          totalDuration: 0,
          jobs: []
        };
      }
      
      // Last konfigurasjon
      const configManager = ConfigManager.getInstance();
      const config = await configManager.loadConfig();
      
      // Forbered konverteringsparametere
      const conversionParameters: ConversionParameters = {
        quality,
        maxWidth,
        maxHeight,
        stripMetadata,
        operation,
        inputFiles,
        pages
      };

      // Merge med preset hvis spesifisert
      let finalParameters = conversionParameters;
      if (preset) {
        const presetConfig = await configManager.getPreset(preset);
        if (presetConfig) {
          finalParameters = { ...presetConfig.parameters, ...conversionParameters };
          logger.debug('Preset anvendt', { preset, parameters: presetConfig.parameters });
        } else {
          logger.warn('Preset ikke funnet', { preset });
        }
      }

      // Merge med globale standarder
      if (config.defaults) {
        finalParameters = { ...config.defaults, ...finalParameters };
      }

      // Start job queue og progress tracking
      return await this.processJobs(supportedPlans, concurrency, retries, finalParameters);
      
    } catch (error) {
      logger.error('Feil under konvertering', { error });
      throw error;
    }
  }

  private async processJobs(
    plans: ConversionPlan[], 
    concurrency: number, 
    retries: number,
    parameters: ConversionParameters
  ): Promise<ConversionResult> {
    const jobQueue = new JobQueue(concurrency);
    const progressTracker = new ProgressTracker();
    
    // Start progress tracking
    progressTracker.start(plans.length);
    
    // Legg til event listeners for progress tracking
    jobQueue.on('jobStarted', (job) => {
      progressTracker.updateJobStatus(job);
    });
    
    jobQueue.on('jobCompleted', (job) => {
      progressTracker.updateJobStatus(job);
    });
    
    jobQueue.on('jobFailed', (job) => {
      progressTracker.updateJobStatus(job);
    });
    
    // Legg til alle jobber i køen
    for (const plan of plans) {
      await jobQueue.addJob(plan, retries, parameters);
    }
    
    // Vent på at alle jobber er ferdig
    const result = await jobQueue.waitForCompletion();
    
    // Stopp progress tracking og vis sammendrag
    progressTracker.stop();
    progressTracker.displaySummary(result);
    
    // Logg jobb-resultater
    this.logJobResults(jobQueue.getJobLogs());
    
    return result;
  }

  private logJobResults(jobLogs: any[]): void {
    logger.info(`Konvertering fullført. ${jobLogs.length} jobber logget.`);
    
    // TODO: Lagre jobb-logger til fil i neste bolk
    for (const log of jobLogs) {
      logger.debug('Jobb logg', log);
    }
  }
  
  private displaySummary(
    allPlans: ConversionPlan[],
    supportedPlans: ConversionPlan[],
    unsupportedPlans: ConversionPlan[],
    dryRun: boolean
  ): void {
    console.log('\n' + chalk.bold.blue('=== KONVERTERINGS SAMMENDRAG ==='));
    console.log(`Totalt antall filer: ${chalk.bold(allPlans.length)}`);
    console.log(`Støttede konverteringer: ${chalk.green.bold(supportedPlans.length)}`);
    console.log(`Ikke-støttede konverteringer: ${chalk.red.bold(unsupportedPlans.length)}`);
    
    if (dryRun) {
      console.log(chalk.yellow('🔍 DRY-RUN MODUS - Ingen filer vil bli endret'));
    }
    
    console.log('');
  }
  
  private displayDetailedPlan(plans: ConversionPlan[]): void {
    console.log(chalk.bold.cyan('=== DETALJERT KONVERTERINGS PLAN ==='));
    
    plans.forEach((plan, index) => {
      const status = plan.supported ? chalk.green('✓') : chalk.red('✗');
      const inputName = path.basename(plan.inputPath);
      const outputName = path.basename(plan.outputPath);
      
      console.log(`${index + 1}. ${status} ${chalk.bold(inputName)} → ${chalk.bold(outputName)}`);
      console.log(`   Fra: ${chalk.gray(plan.inputPath)}`);
      console.log(`   Til:  ${chalk.gray(plan.outputPath)}`);
      console.log(`   Format: ${chalk.blue(plan.inputFormat)} → ${chalk.blue(plan.outputFormat)}`);
      
      if (!plan.supported && plan.reason) {
        console.log(`   ${chalk.red('Årsak:')} ${plan.reason}`);
      }
      
      console.log('');
    });
  }
}
