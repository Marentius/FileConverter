# FileConverter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/Marentius/FileConverter/actions/workflows/ci.yml/badge.svg)](https://github.com/Marentius/FileConverter/actions/workflows/ci.yml)

A fast, zero-config file conversion CLI. Images, documents, PDFs, and OCR — all powered by npm packages with **no external system dependencies**.

## Quick Start

```bash
git clone https://github.com/Marentius/FileConverter.git
cd FileConverter
npm run setup
```

That's it. No need to install LibreOffice, Pandoc, Ghostscript, or Tesseract.

```bash
cd packages/core

# Convert an image
node dist/cli.js convert -i photo.png -o output/ --to jpg

# Markdown to PDF
node dist/cli.js convert -i README.md -o output/ --to pdf

# Merge PDFs
node dist/cli.js pdf --merge a.pdf b.pdf c.pdf -o merged.pdf

# OCR: extract text from an image
node dist/cli.js ocr -i scan.png -o result.txt
```

## Supported Formats

| Category | Input | Output |
|----------|-------|--------|
| **Images** | PNG, JPG, JPEG, WebP, TIFF, BMP, GIF, HEIC | JPG, PNG, WebP, TIFF |
| **Documents** | Markdown, HTML, TXT | PDF, HTML, Markdown, TXT |
| **PDF** | PDF | PDF (merge, split, optimize) |
| **OCR** | PNG, JPG, TIFF, BMP, WebP | TXT |

## CLI Reference

### `convert` — File conversion

```bash
converter convert -i <input> -o <output> --to <format> [options]
```

| Option | Description |
|--------|-------------|
| `-i, --in <path>` | Input file or folder |
| `-o, --out <path>` | Output folder |
| `-t, --to <format>` | Target format (e.g. `png`, `pdf`, `html`) |
| `-r, --recursive` | Search subfolders recursively |
| `--dry-run` | Preview without converting |
| `--concurrency <n>` | Parallel jobs (default: 1) |
| `--retries <n>` | Retry attempts per job (default: 2) |
| `--quality <1-100>` | Image quality |
| `--max-width <px>` | Maximum image width |
| `--max-height <px>` | Maximum image height |
| `--strip-metadata` | Remove image metadata |
| `--preset <name>` | Use a preset (see below) |

### `pdf` — PDF operations

```bash
converter pdf --compress <file> -o <output>
converter pdf --merge <files...> -o <output>
converter pdf --split <file> --pages <range> -o <output>
```

| Option | Description |
|--------|-------------|
| `--compress <file>` | Optimize a PDF (remove orphaned objects) |
| `--merge <files...>` | Merge multiple PDFs into one |
| `--split <file>` | Extract pages from a PDF |
| `--pages <range>` | Page ranges, e.g. `1-3,5,7-9` |
| `-o, --out <file>` | Output file |

### `ocr` — Text extraction

```bash
converter ocr -i <image> -o <output.txt> [--lang <language>]
```

| Option | Description |
|--------|-------------|
| `-i, --in <file>` | Input image (PNG, JPG, TIFF, etc.) |
| `-o, --out <file>` | Output text file |
| `--lang <code>` | Language code (default: `eng`). Examples: `nno`, `deu`, `fra` |

### Other commands

```bash
converter formats          # List supported formats
converter presets          # List image presets
converter preset list      # List all presets (built-in + custom)
converter preset create    # Create a custom preset
converter preset delete    # Delete a custom preset
converter version          # Show version and system info
```

## Presets

Built-in image presets:

| Preset | Quality | Max Size | Strip Metadata |
|--------|---------|----------|----------------|
| `image/web` | 85 | 1920x1080 | Yes |
| `image/print` | 95 | 3000x3000 | No |
| `image/thumbnail` | 80 | 300x300 | Yes |
| `image/social` | 90 | 1200x1200 | Yes |
| `image/original` | 100 | — | No |

```bash
# Use a preset
converter convert -i photos/ -o output/ --to webp --preset image/web -r

# Create a custom preset
converter preset create -n "my-preset" -d "Small JPGs" -t image -p "quality=70;maxWidth=800"
```

## Examples

```bash
# Batch convert a folder of PNGs to WebP
converter convert -i screenshots/ -o optimized/ --to webp --quality 85 -r

# Markdown to HTML
converter convert -i docs/ -o site/ --to html -r

# Split specific pages from a PDF
converter pdf --split thesis.pdf --pages 1-5,10 -o excerpt.pdf

# OCR a scanned document in Norwegian
converter ocr -i scan.png -o text.txt --lang nno

# Dry run to preview what would happen
converter convert -i archive/ -o output/ --to jpg --dry-run
```

## Architecture

```
FileConverter/
├── packages/
│   ├── core/                  # CLI + conversion engine
│   │   ├── src/
│   │   │   ├── cli.ts         # CLI entry point (Commander.js)
│   │   │   ├── converter.ts   # Orchestration layer
│   │   │   ├── file-scanner.ts
│   │   │   ├── job-queue.ts   # Parallel execution (p-queue)
│   │   │   ├── adapters/
│   │   │   │   ├── images/    # Sharp
│   │   │   │   ├── document/  # marked + pdfkit + turndown
│   │   │   │   ├── pdf/       # pdf-lib
│   │   │   │   └── ocr/       # tesseract.js
│   │   │   ├── presets/       # Image presets
│   │   │   └── config/        # Preset management
│   │   └── test/
│   └── gui/                   # Tauri + React desktop app (WIP)
└── package.json               # Workspace root
```

### Adapter pattern

All conversions flow through adapters: `CLI → Converter → FileScanner → JobQueue → Adapter`

The `AdapterManager` selects the right adapter based on input/output format. Each adapter extends `BaseAdapter` and implements a `convert()` method. Currently registered adapters:

| Adapter | Library | Handles |
|---------|---------|---------|
| `SharpAdapter` | sharp | Image format conversion, resize, quality |
| `DocumentAdapter` | marked, pdfkit, turndown | MD/HTML/TXT conversions |
| `PdfAdapter` | pdf-lib | PDF merge, split, optimize |
| `OcrAdapter` | tesseract.js | Image-to-text extraction |

## Development

```bash
# Install all dependencies
npm install

# Build core
npm run core:build

# Watch mode
npm run core:dev

# Run tests
cd packages/core
npm test              # All tests
npm run test:unit     # Adapter unit tests
npm run test:integration
npm run test:e2e
npm run test:coverage

# Lint
npm run lint
npm run lint:fix
```

### Running a single test

```bash
cd packages/core
npx jest path/to/test.spec.ts
```

## Tech Stack

| Component | Library |
|-----------|---------|
| CLI framework | Commander.js |
| Image processing | Sharp |
| PDF manipulation | pdf-lib |
| PDF generation | PDFKit |
| Markdown parsing | marked |
| HTML-to-Markdown | Turndown |
| OCR | tesseract.js (WebAssembly) |
| Logging | Winston |
| Build | tsup (CJS + ESM, targeting Node 22) |
| Testing | Jest + ts-jest |
| Linting | ESLint 9 (flat config) + TypeScript-ESLint |
| Desktop GUI | Tauri + React (work in progress) |

## Requirements

- **Node.js >= 22**
- No external system programs required

## License

MIT
