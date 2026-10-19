// Keep the packaged app icons in sync with the workspace brand mark.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const icons = new URL("../icons/", import.meta.url);
const svg = await readFile(new URL("brand.svg", icons));
await writeFile(
  new URL("icon.png", icons),
  await sharp(svg).resize(512, 512).png().toBuffer(),
);
const sizes = [16, 32, 48, 64, 128, 256];
const buffers = await Promise.all(
  sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + buffers.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(buffers.length, 4);
let offset = header.length;
buffers.forEach((buffer, index) => {
  const start = 6 + index * 16;
  header[start] = sizes[index] === 256 ? 0 : sizes[index];
  header[start + 1] = header[start];
  header.writeUInt16LE(1, start + 4);
  header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(buffer.length, start + 8);
  header.writeUInt32LE(offset, start + 12);
  offset += buffer.length;
});
await writeFile(
  new URL("icon.ico", icons),
  Buffer.concat([header, ...buffers]),
);
