import { ConversionParameters } from '../adapters/base-adapter';

export interface ImagePreset {
  name: string;
  description: string;
  parameters: ConversionParameters;
}

export const IMAGE_PRESETS: Record<string, ImagePreset> = {
  'image/web': {
    name: 'image/web',
    description: 'Optimalisert for web-bruk',
    parameters: {
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080,
      stripMetadata: true
    }
  },
  'image/print': {
    name: 'image/print',
    description: 'Høy kvalitet for utskrift',
    parameters: {
      quality: 95,
      maxWidth: 3000,
      maxHeight: 3000,
      stripMetadata: false
    }
  },
  'image/thumbnail': {
    name: 'image/thumbnail',
    description: 'Liten miniatyrversjon',
    parameters: {
      quality: 80,
      maxWidth: 300,
      maxHeight: 300,
      stripMetadata: true
    }
  },
  'image/social': {
    name: 'image/social',
    description: 'Optimalisert for sosiale medier',
    parameters: {
      quality: 90,
      maxWidth: 1200,
      maxHeight: 1200,
      stripMetadata: true
    }
  },
  'image/original': {
    name: 'image/original',
    description: 'Bevar original kvalitet',
    parameters: {
      quality: 100,
      stripMetadata: false
    }
  }
};

export function getPreset(presetName: string): ImagePreset | undefined {
  return IMAGE_PRESETS[presetName];
}

export function listPresets(): ImagePreset[] {
  return Object.values(IMAGE_PRESETS);
}

export function mergePresetWithParameters(
  presetName: string | undefined,
  userParameters: ConversionParameters
): ConversionParameters {
  const preset = presetName ? getPreset(presetName) : undefined;
  const presetParams = preset?.parameters || {};
  
  // Bruker-parametere overstyrer preset-parametere
  return { ...presetParams, ...userParameters };
}
