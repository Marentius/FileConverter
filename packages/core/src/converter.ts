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
    
    logger.info('Starting file conversion', { 
      input, 
      output, 
      format, 
      recursive, 
      dryRun,
      concurrency,
      retries
    });
    
    try {
      // Create output directory if it doesn't exist
      if (!fs.existsSync(output)) {
        fs.mkdirSync(output, { recursive: true });
        logger.info(`Created output directory: ${output}`);
      }
      
      // Scan for files and create conversion plan
      const plans = await scanForFiles(input, output, format, recursive);
      
      if (plans.length === 0) {
        logger.warn('No files found for conversion');
        return {
          totalJobs: 0,
          successfulJobs: 0,
          failedJobs: 0,
          totalDuration: 0,
          jobs: []
        };
      }
      
      // Analyze plans
      const supportedPlans = plans.filter(p => p.supported);
      const unsupportedPlans = plans.filter(p => !p.supported);
      
      // Show summary
      this.displaySummary(plans, supportedPlans, unsupportedPlans, dryRun);
      
      if (dryRun) {
        // Show detailed plan for dry-run
        this.displayDetailedPlan(plans);
        return {
          totalJobs: plans.length,
          successfulJobs: supportedPlans.length,
          failedJobs: unsupportedPlans.length,
          totalDuration: 0,
          jobs: []
        };
      }
      
      // Load configuration
      const configManager = ConfigManager.getInstance();
      const config = await configManager.loadConfig();
      
      // Prepare conversion parameters
      const conversionParameters: ConversionParameters = {
        quality,
        maxWidth,
        maxHeight,
        stripMetadata,
        operation,
        inputFiles,
        pages
      };

      // Merge with preset if specified
      let finalParameters = conversionParameters;
      if (preset) {
        const presetConfig = await configManager.getPreset(preset);
        if (presetConfig) {
          finalParameters = { ...presetConfig.parameters, ...conversionParameters };
          logger.debug('Preset applied', { preset, parameters: presetConfig.parameters });
        } else {
          logger.warn('Preset not found', { preset });
        }
      }

      // Merge with global defaults
      if (config.defaults) {
        finalParameters = { ...config.defaults, ...finalParameters };
      }

      // Start job queue and progress tracking
      return await this.processJobs(supportedPlans, concurrency, retries, finalParameters);
      
    } catch (error) {
      logger.error('Error during conversion', { error });
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
    logger.info(`Conversion finished. ${jobLogs.length} jobs logged.`);
    
    // TODO: Lagre jobb-logger til fil i neste bolk
    for (const log of jobLogs) {
      logger.debug('Job log', log);
    }
  }
  
  private displaySummary(
    allPlans: ConversionPlan[],
    supportedPlans: ConversionPlan[],
    unsupportedPlans: ConversionPlan[],
    dryRun: boolean
  ): void {
    console.log('\n' + chalk.bold.blue('=== CONVERSION SUMMARY ==='));
    console.log(`Total number of files: ${chalk.bold(allPlans.length)}`);
    console.log(`Supported conversions: ${chalk.green.bold(supportedPlans.length)}`);
    console.log(`Unsupported conversions: ${chalk.red.bold(unsupportedPlans.length)}`);
    
    if (dryRun) {
      console.log(chalk.yellow('🔍 DRY-RUN MODE - No files will be changed'));
    }
    
    console.log('');
  }
  
  private displayDetailedPlan(plans: ConversionPlan[]): void {
    console.log(chalk.bold.cyan('=== DETAILED CONVERSION PLAN ==='));
    
    plans.forEach((plan, index) => {
      const status = plan.supported ? chalk.green('✓') : chalk.red('✗');
      const inputName = path.basename(plan.inputPath);
      const outputName = path.basename(plan.outputPath);
      
      console.log(`${index + 1}. ${status} ${chalk.bold(inputName)} → ${chalk.bold(outputName)}`);
      console.log(`   From: ${chalk.gray(plan.inputPath)}`);
      console.log(`   To:  ${chalk.gray(plan.outputPath)}`);
      console.log(`   Format: ${chalk.blue(plan.inputFormat)} → ${chalk.blue(plan.outputFormat)}`);
      
      if (!plan.supported && plan.reason) {
        console.log(`   ${chalk.red('Reason:')} ${plan.reason}`);
      }
      
      console.log('');
    });
  }
}
