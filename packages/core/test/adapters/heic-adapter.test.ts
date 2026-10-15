import { vi } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import decodeHeic from 'heic-decode';
import { SharpAdapter } from '../../src/adapters/images/sharp-adapter';

vi.mock('heic-decode', () => ({ default: vi.fn() }));

describe('HEIC conversion pipeline', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'heic-test-'));
    vi.mocked(decodeHeic).mockReset();
  });
  afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

  it.each(['jpg', 'png', 'webp', 'tiff'])('encodes decoded HEIC pixels as %s with resize options', async (format) => {
    const inputPath = path.join(directory, 'photo.HEIC');
    const buffer = Buffer.from('HEIC input');
    await fs.writeFile(inputPath, buffer);
    vi.mocked(decodeHeic).mockResolvedValue({
      width: 2, height: 2,
      data: new Uint8ClampedArray(Array(4).fill([255, 0, 0, 255]).flat()),
    });
    const outputPath = path.join(directory, `photo.${format}`);
    const result = await new SharpAdapter().convert({
      inputPath, outputPath, inputFormat: 'heic', outputFormat: format, supported: true,
    }, { maxWidth: 1, quality: 75, stripMetadata: true });
    expect(result.success).toBe(true);
    expect(decodeHeic).toHaveBeenCalledWith({ buffer });
    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(1);
    expect(metadata.height).toBe(1);
    expect(metadata.format).toBe(format === 'jpg' ? 'jpeg' : format);
  });

  it('returns a decoder error without writing an output file', async () => {
    const inputPath = path.join(directory, 'broken.heic');
    const outputPath = path.join(directory, 'broken.jpg');
    await fs.writeFile(inputPath, 'invalid');
    vi.mocked(decodeHeic).mockRejectedValue(new Error('HEIF image not found'));
    const result = await new SharpAdapter().convert({
      inputPath, outputPath, inputFormat: 'heic', outputFormat: 'jpg', supported: true,
    }, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('HEIF image not found');
    await expect(fs.access(outputPath)).rejects.toThrow();
  });
});
