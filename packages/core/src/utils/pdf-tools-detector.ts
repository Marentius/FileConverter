import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../logger';

export interface PdfToolInfo {
  found: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface PdfToolsInfo {
  ghostscript: PdfToolInfo;
  qpdf: PdfToolInfo;
}

export class PdfToolsDetector {
  private static instance: PdfToolsDetector;
  private cachedInfo: PdfToolsInfo | null = null;

  static getInstance(): PdfToolsDetector {
    if (!PdfToolsDetector.instance) {
      PdfToolsDetector.instance = new PdfToolsDetector();
    }
    return PdfToolsDetector.instance;
  }

  async detectPdfTools(): Promise<PdfToolsInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = os.platform();
    const info: PdfToolsInfo = {
      ghostscript: await this.detectGhostscript(platform),
      qpdf: await this.detectQpdf(platform)
    };

    this.cachedInfo = info;
    return info;
  }

  private async detectGhostscript(platform: string): Promise<PdfToolInfo> {
    const info: PdfToolInfo = { found: false };

    try {
      // Prøv å finne gs i PATH
      const gsPath = await this.findToolInPath('gs');
      if (gsPath) {
        info.found = true;
        info.path = gsPath;
        info.version = await this.getGhostscriptVersion(gsPath);
        logger.debug('Ghostscript funnet i PATH', { path: gsPath, version: info.version });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getGhostscriptStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getGhostscriptVersion(standardPath);
          logger.debug('Ghostscript funnet i standardplassering', { path: standardPath, version: info.version });
        } else {
          info.error = this.getGhostscriptInstallationInstructions(platform);
          logger.warn('Ghostscript ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av Ghostscript: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved Ghostscript-oppdagelse', { error });
    }

    return info;
  }

  private async detectQpdf(platform: string): Promise<PdfToolInfo> {
    const info: PdfToolInfo = { found: false };

    try {
      // Prøv å finne qpdf i PATH
      const qpdfPath = await this.findToolInPath('qpdf');
      if (qpdfPath) {
        info.found = true;
        info.path = qpdfPath;
        info.version = await this.getQpdfVersion(qpdfPath);
        logger.debug('qpdf funnet i PATH', { path: qpdfPath, version: info.version });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getQpdfStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getQpdfVersion(standardPath);
          logger.debug('qpdf funnet i standardplassering', { path: standardPath, version: info.version });
        } else {
          info.error = this.getQpdfInstallationInstructions(platform);
          logger.warn('qpdf ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av qpdf: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved qpdf-oppdagelse', { error });
    }

    return info;
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

  private getGhostscriptStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\gs\\gs10.01.1\\bin\\gswin64c.exe';
      case 'darwin':
        return '/usr/local/bin/gs';
      case 'linux':
        return '/usr/bin/gs';
      default:
        return null;
    }
  }

  private getQpdfStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\qpdf\\bin\\qpdf.exe';
      case 'darwin':
        return '/usr/local/bin/qpdf';
      case 'linux':
        return '/usr/bin/qpdf';
      default:
        return null;
    }
  }

  private async getGhostscriptVersion(gsPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${gsPath}" --version`, { encoding: 'utf8' });
      const match = result.match(/Ghostscript\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private async getQpdfVersion(qpdfPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${qpdfPath}" --version`, { encoding: 'utf8' });
      const match = result.match(/qpdf\s+version\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private getGhostscriptInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'Ghostscript ikke funnet. Last ned og installer fra https://www.ghostscript.com/releases/gsdnld.html';
      case 'darwin':
        return 'Ghostscript ikke funnet. Installer med: brew install ghostscript';
      case 'linux':
        return 'Ghostscript ikke funnet. Installer med: sudo apt-get install ghostscript (Ubuntu/Debian) eller sudo yum install ghostscript (RHEL/CentOS)';
      default:
        return 'Ghostscript ikke funnet. Se https://www.ghostscript.com/releases/gsdnld.html for installasjonsinstruksjoner.';
    }
  }

  private getQpdfInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'qpdf ikke funnet. Last ned og installer fra https://qpdf.sourceforge.io/';
      case 'darwin':
        return 'qpdf ikke funnet. Installer med: brew install qpdf';
      case 'linux':
        return 'qpdf ikke funnet. Installer med: sudo apt-get install qpdf (Ubuntu/Debian) eller sudo yum install qpdf (RHEL/CentOS)';
      default:
        return 'qpdf ikke funnet. Se https://qpdf.sourceforge.io/ for installasjonsinstruksjoner.';
    }
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}
