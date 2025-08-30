import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../logger';

export interface OcrToolInfo {
  found: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface OcrToolsInfo {
  ocrmypdf: OcrToolInfo;
  tesseract: OcrToolInfo;
  languages: string[];
}

export class OcrDetector {
  private static instance: OcrDetector;
  private cachedInfo: OcrToolsInfo | null = null;

  static getInstance(): OcrDetector {
    if (!OcrDetector.instance) {
      OcrDetector.instance = new OcrDetector();
    }
    return OcrDetector.instance;
  }

  async detectOcrTools(): Promise<OcrToolsInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = os.platform();
    const info: OcrToolsInfo = {
      ocrmypdf: await this.detectOcrmypdf(platform),
      tesseract: await this.detectTesseract(platform),
      languages: await this.detectLanguages()
    };

    this.cachedInfo = info;
    return info;
  }

  private async detectOcrmypdf(platform: string): Promise<OcrToolInfo> {
    const info: OcrToolInfo = { found: false };

    try {
      // Prøv å finne ocrmypdf i PATH
      const ocrmypdfPath = await this.findToolInPath('ocrmypdf');
      if (ocrmypdfPath) {
        info.found = true;
        info.path = ocrmypdfPath;
        info.version = await this.getOcrmypdfVersion(ocrmypdfPath);
        logger.debug('ocrmypdf funnet i PATH', { path: ocrmypdfPath, version: info.version });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getOcrmypdfStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getOcrmypdfVersion(standardPath);
          logger.debug('ocrmypdf funnet i standardplassering', { path: standardPath, version: info.version });
        } else {
          info.error = this.getOcrmypdfInstallationInstructions(platform);
          logger.warn('ocrmypdf ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av ocrmypdf: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved ocrmypdf-oppdagelse', { error });
    }

    return info;
  }

  private async detectTesseract(platform: string): Promise<OcrToolInfo> {
    const info: OcrToolInfo = { found: false };

    try {
      // Prøv å finne tesseract i PATH
      const tesseractPath = await this.findToolInPath('tesseract');
      if (tesseractPath) {
        info.found = true;
        info.path = tesseractPath;
        info.version = await this.getTesseractVersion(tesseractPath);
        logger.debug('Tesseract funnet i PATH', { path: tesseractPath, version: info.version });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getTesseractStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getTesseractVersion(standardPath);
          logger.debug('Tesseract funnet i standardplassering', { path: standardPath, version: info.version });
        } else {
          info.error = this.getTesseractInstallationInstructions(platform);
          logger.warn('Tesseract ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av Tesseract: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved Tesseract-oppdagelse', { error });
    }

    return info;
  }

  private async detectLanguages(): Promise<string[]> {
    const languages: string[] = [];
    
    try {
      const tesseractPath = await this.findToolInPath('tesseract');
      if (tesseractPath) {
        const result = execSync(`"${tesseractPath}" --list-langs`, { encoding: 'utf8' });
        const lines = result.split('\n');
        
        for (const line of lines) {
          const lang = line.trim();
          if (lang && !lang.startsWith('List of available languages')) {
            languages.push(lang);
          }
        }
        
        logger.debug('Tesseract språk funnet', { languages });
      }
    } catch (error) {
      logger.warn('Kunne ikke hente Tesseract språk', { error });
    }
    
    return languages;
  }

  private async findToolInPath(toolName: string): Promise<string | null> {
    try {
      const command = os.platform() === 'win32' ? `where ${toolName}` : `which ${toolName}`;
      const result = execSync(command, { encoding: 'utf8' }).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  private getOcrmypdfStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\ocrmypdf\\ocrmypdf.exe';
      case 'darwin':
        return '/usr/local/bin/ocrmypdf';
      case 'linux':
        return '/usr/bin/ocrmypdf';
      default:
        return null;
    }
  }

  private getTesseractStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
      case 'darwin':
        return '/usr/local/bin/tesseract';
      case 'linux':
        return '/usr/bin/tesseract';
      default:
        return null;
    }
  }

  private async getOcrmypdfVersion(ocrmypdfPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${ocrmypdfPath}" --version`, { encoding: 'utf8' });
      const match = result.match(/ocrmypdf\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private async getTesseractVersion(tesseractPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${tesseractPath}" --version`, { encoding: 'utf8' });
      const match = result.match(/tesseract\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private getOcrmypdfInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'ocrmypdf ikke funnet. Installer med: pip install ocrmypdf';
      case 'darwin':
        return 'ocrmypdf ikke funnet. Installer med: brew install ocrmypdf';
      case 'linux':
        return 'ocrmypdf ikke funnet. Installer med: sudo apt-get install ocrmypdf (Ubuntu/Debian) eller sudo yum install ocrmypdf (RHEL/CentOS)';
      default:
        return 'ocrmypdf ikke funnet. Se https://ocrmypdf.readthedocs.io/en/latest/installation.html for installasjonsinstruksjoner.';
    }
  }

  private getTesseractInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'Tesseract ikke funnet. Last ned og installer fra https://github.com/UB-Mannheim/tesseract/wiki';
      case 'darwin':
        return 'Tesseract ikke funnet. Installer med: brew install tesseract';
      case 'linux':
        return 'Tesseract ikke funnet. Installer med: sudo apt-get install tesseract-ocr (Ubuntu/Debian) eller sudo yum install tesseract (RHEL/CentOS)';
      default:
        return 'Tesseract ikke funnet. Se https://tesseract-ocr.github.io/tessdoc/Installation.html for installasjonsinstruksjoner.';
    }
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}
