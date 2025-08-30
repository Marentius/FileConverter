import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../logger';

export interface PandocInfo {
  found: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface LaTeXInfo {
  found: boolean;
  path?: string;
  version?: string;
  distribution?: string; // 'miktex', 'texlive', etc.
  error?: string;
}

export interface PandocToolsInfo {
  pandoc: PandocInfo;
  latex: LaTeXInfo;
}

export class PandocDetector {
  private static instance: PandocDetector;
  private cachedInfo: PandocToolsInfo | null = null;

  static getInstance(): PandocDetector {
    if (!PandocDetector.instance) {
      PandocDetector.instance = new PandocDetector();
    }
    return PandocDetector.instance;
  }

  async detectPandocTools(): Promise<PandocToolsInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = os.platform();
    const info: PandocToolsInfo = {
      pandoc: await this.detectPandoc(platform),
      latex: await this.detectLaTeX(platform)
    };

    this.cachedInfo = info;
    return info;
  }

  private async detectPandoc(platform: string): Promise<PandocInfo> {
    const info: PandocInfo = { found: false };

    try {
      // Prøv å finne pandoc i PATH
      const pandocPath = await this.findToolInPath('pandoc');
      if (pandocPath) {
        info.found = true;
        info.path = pandocPath;
        info.version = await this.getPandocVersion(pandocPath);
        logger.debug('Pandoc funnet i PATH', { path: pandocPath, version: info.version });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getPandocStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getPandocVersion(standardPath);
          logger.debug('Pandoc funnet i standardplassering', { path: standardPath, version: info.version });
        } else {
          info.error = this.getPandocInstallationInstructions(platform);
          logger.warn('Pandoc ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av Pandoc: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved Pandoc-oppdagelse', { error });
    }

    return info;
  }

  private async detectLaTeX(platform: string): Promise<LaTeXInfo> {
    const info: LaTeXInfo = { found: false };

    try {
      // Prøv å finne pdflatex i PATH
      const pdflatexPath = await this.findToolInPath('pdflatex');
      if (pdflatexPath) {
        info.found = true;
        info.path = pdflatexPath;
        info.version = await this.getLaTeXVersion(pdflatexPath);
        info.distribution = await this.detectLaTeXDistribution(pdflatexPath);
        logger.debug('LaTeX funnet i PATH', { path: pdflatexPath, version: info.version, distribution: info.distribution });
      } else {
        // Prøv standardplasseringer
        const standardPath = this.getLaTeXStandardPath(platform);
        if (standardPath && fs.existsSync(standardPath)) {
          info.found = true;
          info.path = standardPath;
          info.version = await this.getLaTeXVersion(standardPath);
          info.distribution = await this.detectLaTeXDistribution(standardPath);
          logger.debug('LaTeX funnet i standardplassering', { path: standardPath, version: info.version, distribution: info.distribution });
        } else {
          info.error = this.getLaTeXInstallationInstructions(platform);
          logger.warn('LaTeX ikke funnet', { platform, error: info.error });
        }
      }
    } catch (error) {
      info.error = `Feil ved oppdagelse av LaTeX: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Feil ved LaTeX-oppdagelse', { error });
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

  private getPandocStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\Pandoc\\pandoc.exe';
      case 'darwin':
        return '/usr/local/bin/pandoc';
      case 'linux':
        return '/usr/bin/pandoc';
      default:
        return null;
    }
  }

  private getLaTeXStandardPath(platform: string): string | null {
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe';
      case 'darwin':
        return '/usr/local/bin/pdflatex';
      case 'linux':
        return '/usr/bin/pdflatex';
      default:
        return null;
    }
  }

  private async getPandocVersion(pandocPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${pandocPath}" --version`, { encoding: 'utf8' });
      const match = result.match(/pandoc\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private async getLaTeXVersion(pdflatexPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${pdflatexPath}" --version`, { encoding: 'utf8' });
      const match = result.match(/pdfTeX\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private async detectLaTeXDistribution(pdflatexPath: string): Promise<string | undefined> {
    try {
      const result = execSync(`"${pdflatexPath}" --version`, { encoding: 'utf8' });
      if (result.includes('MiKTeX')) {
        return 'miktex';
      } else if (result.includes('TeX Live')) {
        return 'texlive';
      } else {
        return 'unknown';
      }
    } catch {
      return undefined;
    }
  }

  private getPandocInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'Pandoc ikke funnet. Last ned og installer fra https://pandoc.org/installing.html';
      case 'darwin':
        return 'Pandoc ikke funnet. Installer med: brew install pandoc';
      case 'linux':
        return 'Pandoc ikke funnet. Installer med: sudo apt-get install pandoc (Ubuntu/Debian) eller sudo yum install pandoc (RHEL/CentOS)';
      default:
        return 'Pandoc ikke funnet. Se https://pandoc.org/installing.html for installasjonsinstruksjoner.';
    }
  }

  private getLaTeXInstallationInstructions(platform: string): string {
    switch (platform) {
      case 'win32':
        return 'LaTeX ikke funnet. Installer MiKTeX fra https://miktex.org/download eller TeX Live fra https://www.tug.org/texlive/';
      case 'darwin':
        return 'LaTeX ikke funnet. Installer med: brew install --cask mactex eller brew install --cask basictex';
      case 'linux':
        return 'LaTeX ikke funnet. Installer med: sudo apt-get install texlive-full (Ubuntu/Debian) eller sudo yum install texlive-scheme-full (RHEL/CentOS)';
      default:
        return 'LaTeX ikke funnet. Se https://www.latex-project.org/get/ for installasjonsinstruksjoner.';
    }
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}
