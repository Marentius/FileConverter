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
      // Try to find soffice in PATH
      const sofficePath = await this.findSofficeInPath();
      if (sofficePath) {
        info.found = true;
        info.path = sofficePath;
        info.version = await this.getVersion(sofficePath);
        logger.debug('LibreOffice found in PATH', { path: sofficePath, version: info.version });
      } else {
        // Try standard locations
        const standardPath = this.getStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getVersion(standardPath);
          logger.debug('LibreOffice found in standard location', { path: standardPath, version: info.version });
        } else {
          info.error = this.getInstallationInstructions(platform);
          logger.warn('LibreOffice not found', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Error detecting LibreOffice: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Error during LibreOffice detection', { error });
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
        return 'LibreOffice not found. Download and install from https://www.libreoffice.org/download/download/';
      case 'darwin':
        return 'LibreOffice not found. Install with: brew install --cask libreoffice';
      case 'linux':
        return 'LibreOffice not found. Install with: sudo apt-get install libreoffice (Ubuntu/Debian) or sudo yum install libreoffice (RHEL/CentOS)';
      default:
        return 'LibreOffice not found. See https://www.libreoffice.org/download/download/ for installation instructions.';
    }
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}
