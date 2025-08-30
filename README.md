# FileConverter 🔄

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/Marentius/FileConverter/actions/workflows/ci.yml/badge.svg)](https://github.com/Marentius/FileConverter/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](https://github.com/Marentius/FileConverter)

**Universal file conversion tool with batch support**

## ✨ Features

### 🖼️ **Image Conversion**
- **Supported formats**: PNG, JPG, WebP, TIFF, BMP, GIF, HEIC
- **Advanced options**: Resize, quality control, metadata handling
- **Batch support**: Convert entire folders with one command
- **Preset system**: Web, print, thumbnail, social media optimization

### 📄 **Document Conversion**
- **Office formats**: DOCX, PPTX, XLSX ↔ PDF
- **Markup formats**: MD, HTML, RTF, TXT ↔ PDF/DOCX
- **LibreOffice integration**: Automatic detection and conversion
- **Pandoc support**: Advanced document conversion with LaTeX

### 📊 **PDF Operations**
- **Compression**: Screen, ebook, printer, prepress presets
- **Merging**: Combine multiple PDF files
- **Splitting**: Split PDF into pages or ranges
- **Ghostscript/qpdf**: Professional PDF tools

### 🔍 **OCR Functionality**
- **PDF → searchable PDF**: With ocrmypdf
- **Image → text**: With Tesseract
- **Language support**: Norwegian, English, German and more
- **Quality settings**: Fast, standard, high

### 🎛️ **Advanced Features**
- **CLI & GUI**: Command line and modern desktop app
- **Preset system**: Global and local configurations
- **Batch processing**: Parallel conversion with retry logic
- **Dry-run mode**: Test conversions without changes
- **Comprehensive logging**: JSON logs with detailed information

## 🚀 Getting Started

### Installation

```bash
# Clone the project
git clone https://github.com/Marentius/FileConverter.git
cd FileConverter

# Install root dependencies
npm install

# Install and build core package (CLI)
cd packages/core
npm install
npm run build

# Install and build GUI package
cd ../gui
npm install
npx tauri build

# Return to root and link CLI globally (optional)
cd ../..
npm link
```

### Alternative: Quick Installation Script

```bash
# Clone and setup everything automatically
git clone https://github.com/Marentius/FileConverter.git
cd FileConverter
npm run setup
```

### Development Setup

```bash
# Install all dependencies and build for development
npm install
cd packages/core && npm install && npm run build
cd ../gui && npm install && npx tauri build
cd ../..
npm link
```

### Quick Start

```bash
# Convert single image
converter convert -i image.jpg -o output.png -t png

# Batch conversion of folders
converter convert -i photos/ -o converted/ -t webp --recursive

# Document to PDF
converter convert -i document.docx -o output.pdf -t pdf

# Compress PDF
converter pdf --compress input.pdf -o compressed.pdf --preset screen
```

## 📋 Complete CLI Commands

### 🚀 **Main Commands**

#### **1. Basic Conversion**
```bash
converter convert [options]
```
**Options:**
- `-i, --in <path>` - Input file or folder
- `-o, --out <path>` - Output folder  
- `-t, --to <format>` - Target format (e.g., png, pdf, docx)
- `-r, --recursive` - Search recursively in subfolders
- `--dry-run` - Show what would happen without converting
- `--concurrency <number>` - Number of parallel jobs (default: 1)
- `--retries <number>` - Number of retry attempts per job (default: 2)
- `--quality <number>` - Quality for image conversion (1-100)
- `--max-width <number>` - Maximum width for images
- `--max-height <number>` - Maximum height for images
- `--strip-metadata` - Remove metadata from images
- `--preset <name>` - Use preset (image/web, image/print, image/thumbnail, etc.)

#### **2. PDF Operations**
```bash
converter pdf [options]
```
**Options:**
- `--compress <file>` - Compress PDF file
- `--merge <files...>` - Merge multiple PDF files
- `--split <file>` - Split PDF file
- `--pages <range>` - Page ranges for split (e.g., 1-3,5,7-9)
- `--preset <name>` - PDF preset (screen, ebook, printer, prepress)
- `-o, --out <file>` - Output PDF file

#### **3. OCR Operations**
```bash
converter ocr [options]
```
**Options:**
- `-i, --in <file>` - Input file (PDF, PNG, JPG, etc.)
- `-o, --out <file>` - Output file
- `--lang <language>` - Language for OCR (e.g., eng, nno, deu)
- `--quality <level>` - OCR quality (fast, standard, high) (default: "standard")

### 📊 **Information Commands**

#### **4. Show supported formats**
```bash
converter formats
```

#### **5. Show available presets**
```bash
converter presets
```

#### **6. Show PDF presets**
```bash
converter pdf-presets
```

#### **7. Show version and system info**
```bash
converter version
```

### 🔧 **System Check Commands**

#### **8. Check LibreOffice**
```bash
converter check-libreoffice
```

#### **9. Check PDF tools**
```bash
converter check-pdf-tools
```

#### **10. Check Pandoc**
```bash
converter check-pandoc
```

#### **11. Check OCR tools**
```bash
converter check-ocr
```

### ⚙️ **Preset Management**

#### **12. List all presets**
```bash
converter preset list
```

#### **13. Create new preset**
```bash
converter preset create [options]
```
**Options:**
- `-n, --name <name>` - Preset name
- `-d, --description <description>` - Preset description
- `-t, --type <type>` - Preset type (image|pdf|document)
- `-p, --parameters <parameters>` - Preset parameters (format: key1=value1;key2=value2)
- `-s, --scope <scope>` - Preset scope (global|local) (default: "local")

#### **14. Delete preset**
```bash
converter preset delete [options]
```
**Options:**
- `-n, --name <name>` - Preset name
- `-s, --scope <scope>` - Preset scope (global|local) (default: "local")

### 📝 **Practical Examples**

#### **Image Conversion:**
```bash
# PNG to JPG with high quality
converter convert -i image.png -o output.jpg -t jpg --quality 95

# WebP conversion with preset
converter convert -i images/ -o output/ -t webp --preset image/web --recursive

# HEIC to PNG (requires ImageMagick)
converter convert -i photo.heic -o photo.png -t png
```

#### **Document Conversion:**
```bash
# Office documents to PDF
converter convert -i document.docx -o output.pdf -t pdf
converter convert -i presentation.pptx -o output.pdf -t pdf
converter convert -i spreadsheet.xlsx -o output.pdf -t pdf

# Markdown to PDF with LaTeX
converter convert -i readme.md -o readme.pdf -t pdf
```

#### **PDF Operations:**
```bash
# Compress PDF for web
converter pdf --compress input.pdf -o compressed.pdf --preset screen

# Merge multiple PDF files
converter pdf --merge chapter1.pdf chapter2.pdf chapter3.pdf -o book.pdf

# Split PDF
converter pdf --split document.pdf --pages 1-3,5,7-9 -o partial.pdf
```

#### **OCR Operations:**
```bash
# Make PDF searchable
converter ocr -i scanned-document.pdf -o searchable.pdf --lang nno

# Extract text from image
converter ocr -i image-with-text.png -o extracted-text.txt --lang eng --quality high
```

#### **Preset Management:**
```bash
# Create custom image preset
converter preset create -n "my-web" -d "My web optimization" -t image -p "quality=85;maxWidth=1200;stripMetadata=true"

# List all presets
converter preset list

# Delete preset
converter preset delete -n "my-web"
```

### 🆘 **Help Commands**

```bash
# General help
converter --help

# Help for specific command
converter convert --help
converter pdf --help
converter ocr --help
converter preset --help
```

## 🖥️ GUI Application

FileConverter comes with a modern desktop application built with Tauri + React:

### GUI Features:
- **Drag-and-drop**: Easy file and folder selection
- **Format selector**: Visual overview of all supported formats
- **Progress tracking**: Live progress for conversions
- **Dependency check**: Automatic check of external tools
- **Advanced settings**: Access to all CLI options

### Start GUI:
```bash
# Development mode
npm run gui:dev

# Build for production
npm run gui:build
```

## 📦 Supported Formats

### 🖼️ **Image Formats**
- **Input/Output**: PNG, JPG, WebP, TIFF, BMP, GIF
- **Input**: HEIC (requires ImageMagick)

### 📄 **Document Formats**
- **Office**: DOCX, PPTX, XLSX ↔ PDF
- **Markup**: MD, HTML, RTF, TXT ↔ PDF/DOCX
- **PDF**: Compression, merging, splitting

### 🎵 **Media Formats** *(planned)*
- **Video**: MP4, MOV
- **Audio**: MP3, WAV

## 🔧 Dependencies

FileConverter uses external tools for advanced features:

### **Required for document conversion:**
- **LibreOffice**: Office formats ↔ PDF
- **Pandoc**: Markup formats ↔ PDF/DOCX
- **LaTeX**: High quality PDF from markdown

### **Required for PDF operations:**
- **Ghostscript**: PDF compression
- **qpdf**: Advanced PDF manipulation

### **Required for OCR:**
- **ocrmypdf**: PDF → searchable PDF
- **Tesseract**: Image → text

### **Required for HEIC:**
- **ImageMagick**: HEIC support on Windows

## 🏗️ Project Structure

```
FileConverter/
├── packages/
│   ├── core/                 # TypeScript CLI + library
│   │   ├── src/
│   │   │   ├── cli.ts        # CLI entry point
│   │   │   ├── converter.ts  # Main conversion logic
│   │   │   ├── adapters/     # Conversion adapters
│   │   │   │   ├── images/   # Sharp, ImageMagick
│   │   │   │   ├── office/   # LibreOffice
│   │   │   │   ├── document/ # Pandoc
│   │   │   │   ├── pdf/      # Ghostscript, qpdf
│   │   │   │   └── ocr/      # ocrmypdf, Tesseract
│   │   │   ├── presets/      # Preset system
│   │   │   └── utils/        # Helper utilities
│   │   ├── dist/             # Built code
│   │   └── test/             # Tests
│   └── gui/                  # Tauri + React GUI
│       ├── src/              # React components
│       └── src-tauri/        # Rust backend
├── logs/                     # Log files
└── docs/                     # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

## 🚀 Development

```bash
# Start development mode
npm run dev

# Build project
npm run build

# Lint code
npm run lint
npm run lint:fix

# Clean up
npm run clean
```

## 📊 Status

### ✅ **Fully implemented:**
- CLI with all main commands
- Image conversion (Sharp + ImageMagick)
- Document conversion (LibreOffice + Pandoc)
- PDF operations (Ghostscript + qpdf)
- OCR functionality (ocrmypdf + Tesseract)
- Preset system with global/local scope
- Comprehensive testing (33 tests)
- GUI application (Tauri + React)
- CI/CD pipeline

### 🔄 **In development:**
- Media conversion (video/audio)
- Multiple languages in GUI
- Cloud integration

### 📋 **Planned:**
- Web API
- Plugin system
- More output formats

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Sharp** - Image conversion
- **LibreOffice** - Office documents
- **Pandoc** - Markup conversion
- **Ghostscript** - PDF operations
- **Tesseract** - OCR functionality
- **Tauri** - Desktop application

---

**FileConverter** - Making file conversion easy and powerful! 🚀
