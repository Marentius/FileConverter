import { createTestFile } from './setup';
import { detectFileType, getSupportedFormats, isSupportedFormat } from '../src/file-detector';
import { fileTypeFromFile } from 'file-type';

describe('file-detector', () => {
  it('should support SVG files by extension', async () => {
    (fileTypeFromFile as jest.Mock).mockResolvedValueOnce(undefined);

    const filePath = createTestFile(
      'detector-test.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
    );

    const result = await detectFileType(filePath);

    expect(result).toEqual({
      ext: 'svg',
      mime: 'image/svg+xml',
      supported: true,
    });
    expect(isSupportedFormat('svg')).toBe(true);
    expect(getSupportedFormats()).toContain('svg');
  });
});
