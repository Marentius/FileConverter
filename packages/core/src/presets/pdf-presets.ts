export interface PdfPreset {
  name: string;
  description: string;
  ghostscriptSettings: {
    dPDFSETTINGS: string;
    dCompatibilityLevel: string;
    dAutoFilterColorImages: boolean;
    dAutoFilterGrayImages: boolean;
    dColorImageFilter: string;
    dGrayImageFilter: string;
    dMonoImageFilter: string;
    dDownsampleColorImages: boolean;
    dDownsampleGrayImages: boolean;
    dDownsampleMonoImages: boolean;
    dColorImageResolution: number;
    dGrayImageResolution: number;
    dMonoImageResolution: number;
  };
}

export const PDF_PRESETS: Record<string, PdfPreset> = {
  'screen': {
    name: 'screen',
    description: 'Optimalisert for skjermvisning (72 dpi)',
    ghostscriptSettings: {
      dPDFSETTINGS: '/screen',
      dCompatibilityLevel: '1.4',
      dAutoFilterColorImages: true,
      dAutoFilterGrayImages: true,
      dColorImageFilter: '/DCTEncode',
      dGrayImageFilter: '/DCTEncode',
      dMonoImageFilter: '/CCITTFaxEncode',
      dDownsampleColorImages: true,
      dDownsampleGrayImages: true,
      dDownsampleMonoImages: true,
      dColorImageResolution: 72,
      dGrayImageResolution: 72,
      dMonoImageResolution: 72
    }
  },
  'ebook': {
    name: 'ebook',
    description: 'Optimalisert for e-bøker (150 dpi)',
    ghostscriptSettings: {
      dPDFSETTINGS: '/ebook',
      dCompatibilityLevel: '1.4',
      dAutoFilterColorImages: true,
      dAutoFilterGrayImages: true,
      dColorImageFilter: '/DCTEncode',
      dGrayImageFilter: '/DCTEncode',
      dMonoImageFilter: '/CCITTFaxEncode',
      dDownsampleColorImages: true,
      dDownsampleGrayImages: true,
      dDownsampleMonoImages: true,
      dColorImageResolution: 150,
      dGrayImageResolution: 150,
      dMonoImageResolution: 150
    }
  },
  'printer': {
    name: 'printer',
    description: 'Høy kvalitet for utskrift (300 dpi)',
    ghostscriptSettings: {
      dPDFSETTINGS: '/printer',
      dCompatibilityLevel: '1.4',
      dAutoFilterColorImages: false,
      dAutoFilterGrayImages: false,
      dColorImageFilter: '/DCTEncode',
      dGrayImageFilter: '/DCTEncode',
      dMonoImageFilter: '/CCITTFaxEncode',
      dDownsampleColorImages: true,
      dDownsampleGrayImages: true,
      dDownsampleMonoImages: true,
      dColorImageResolution: 300,
      dGrayImageResolution: 300,
      dMonoImageResolution: 300
    }
  },
  'prepress': {
    name: 'prepress',
    description: 'Høy kvalitet for prepress (300 dpi)',
    ghostscriptSettings: {
      dPDFSETTINGS: '/prepress',
      dCompatibilityLevel: '1.4',
      dAutoFilterColorImages: false,
      dAutoFilterGrayImages: false,
      dColorImageFilter: '/DCTEncode',
      dGrayImageFilter: '/DCTEncode',
      dMonoImageFilter: '/CCITTFaxEncode',
      dDownsampleColorImages: false,
      dDownsampleGrayImages: false,
      dDownsampleMonoImages: false,
      dColorImageResolution: 300,
      dGrayImageResolution: 300,
      dMonoImageResolution: 300
    }
  }
};

export function getPdfPreset(presetName: string): PdfPreset | undefined {
  return PDF_PRESETS[presetName];
}

export function listPdfPresets(): PdfPreset[] {
  return Object.values(PDF_PRESETS);
}

export function getDefaultPdfPreset(): PdfPreset {
  return PDF_PRESETS['screen'];
}
