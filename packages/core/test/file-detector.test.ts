import { vi, type Mock } from 'vitest';
import { createTestFile } from './setup';
import { detectFileType, getSupportedFormats, isSupportedFormat } from '../src/file-detector';
import { fileTypeFromFile } from 'file-type';

vi.mock('file-type', () => ({
  fileTypeFromFile: vi.fn().mockResolvedValue({
    ext: 'txt',
    mime: 'text/plain',
  }),
  fileTypeFromBuffer: vi.fn().mockResolvedValue({
    ext: 'txt',
    mime: 'text/plain',
  }),
}));
describe('file-detector', () => {
  it('should support SVG files by extension', async () => {
    (fileTypeFromFile as Mock).mockResolvedValueOnce(undefined);

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
