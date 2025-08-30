import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../logger';

export interface LibreOfficeInfo {
  found: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export class LibreOfficeDetector {
  private static instance: LibreOfficeDetector;
  private cachedInfo: LibreOfficeInfo | null = null;

  static getInstance(): LibreOfficeDetector {
    if (!LibreOfficeDetector.instance) {
      LibreOfficeDetector.instance = new LibreOfficeDetector();
    }
    return LibreOfficeDetector.instance;
  }

  async detectLibreOffice(): Promise<LibreOfficeInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = os.platform();
    const info: LibreOfficeInfo = { found: false };

    try {
      // Prøv å finne soffice i PATH
      const sofficePath = await this.findSofficeInPath();
      if (sofficePath) {
        info.found = true;
        info.path = sofficePath;
        info.version = await this.getVersion(sofficePath);
        logger.debug('LibreOffice funnet i PATH', { path: sofficePath, version: info.version });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getVersion(standardPath);
          logger.debug('LibreOffice funnet i standardplassering', { path: standardPath, version: info.version });
        } else {
          info.error = this.getInstallationInstructions(platform);
          logger.warn('LibreOffice ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av LibreOffice: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved LibreOffice-oppdagelse', { error });
    }

    this.cachedInfo = info;
    return info;
  }

  private async findSofficeInPath(): Promise<string | null> {
    try {
      const command = os.platform() === 'win32' ? 'where soffice' : 'which soffice';
      const result = execSync(command, { encoding: 'utf8' }).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  private getStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
      case 'darwin':
        return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
      case 'linux':
        return '/usr/bin/soffice';
      default:
        return null;
    }
  }

  private async getVersion(sofficePath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${sofficePath}" --version`, { encoding: 'utf8' });
      const match = result.match(/LibreOffice\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private getInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'LibreOffice ikke funnet. Last ned og installer fra https://www.libreoffice.org/download/download/';
      case 'darwin':
        return 'LibreOffice ikke funnet. Installer med: brew install --cask libreoffice';
      case 'linux':
        return 'LibreOffice ikke funnet. Installer med: sudo apt-get install libreoffice (Ubuntu/Debian) eller sudo yum install libreoffice (RHEL/CentOS)';
      default:
        return 'LibreOffice ikke funnet. Se https://www.libreoffice.org/download/download/ for installasjonsinstruksjoner.';
    }
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}
