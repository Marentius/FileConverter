# FileConverter

Universelt filkonverteringsverktøy med batch-støtte, for "alt fra HEIC→PNG til DOCX→PDF, PDF→DOCX, PPTX→PDF, osv."

## 🚀 Bolk 8 - OCR-funksjonalitet

Dette er åttende bolk av FileConverter-prosjektet som implementerer OCR (Optical Character Recognition) funksjonalitet.

### Funksjoner

- ✅ CLI med commander.js
- ✅ Filtype-deteksjon (MIME + extension fallback)
- ✅ Mappe-skanning med glob-støtte
- ✅ Dry-run modus
- ✅ Logging til console og fil
- ✅ Støtte for rekursive søk
- ✅ Job queue med parallellisering
- ✅ Retry-logikk med konfigurerbare forsøk
- ✅ Progress bar med live status
- ✅ Detaljerte jobb-logger (JSON)
- ✅ Faktisk bildekonvertering med Sharp
- ✅ HEIC-støtte med libheif
- ✅ Preset-system (image/web, image/print, etc.)
- ✅ Custom parametere (quality, max-width, etc.)
- ✅ Dokumentkonvertering med LibreOffice
- ✅ Office-formater (DOCX, PPTX, XLSX) → PDF
- ✅ Automatisk LibreOffice-deteksjon
- ✅ Tydelige feilmeldinger og installasjonsinstruksjoner
- ✅ PDF-operasjoner med Ghostscript og qpdf
- ✅ PDF-komprimering med presets (screen, ebook, printer, prepress)
- ✅ PDF-merge og split-operasjoner
- ✅ Størrelserapportering før/etter komprimering
- ✅ PDF → DOCX konvertering (LibreOffice, med advarsel om layouttap)
- ✅ Pandoc-basert konvertering (MD/HTML/RTF/TXT → PDF/DOCX)
- ✅ Automatisk Pandoc- og LaTeX-deteksjon
- ✅ Valgfri LaTeX for høyere PDF-kvalitet
- ✅ Avansert preset-system med global/lokal scope
- ✅ Konfigurasjonsfiler (JSON/YAML) med rekkefølge
- ✅ CLI-kommandoer for preset-håndtering
- ✅ Built-in, user og project presets
- ✅ OCR-funksjonalitet med ocrmypdf og Tesseract
- ✅ PDF → søkbar PDF konvertering
- ✅ Bilde → tekst ekstrahering
- ✅ Språkstøtte for OCR (norsk, engelsk, etc.)
- ✅ Kvalitetsinnstillinger (fast, standard, høy)

### Installasjon

```bash
# Installer avhengigheter
npm install

# Bygg prosjektet
npm run build

# Link CLI globalt (for å bruke 'converter' kommando)
npm link
```

### Bruk

Etter at du har kjørt `npm link`, kan du bruke `converter` kommandoen direkte:

```bash
# Konverter enkelt fil
converter convert --in image.jpg --out output/ --to png

# Konverter hele mappe
converter convert --in input-folder/ --out output/ --to pdf

# Rekursiv søk i undermapper
converter convert --in input-folder/ --out output/ --to png --recursive

# Dry-run (vis hva som ville skjedd)
converter convert --in input-folder/ --out output/ --to pdf --dry-run

# Parallell konvertering med retry
converter convert --in input-folder/ --out output/ --to pdf --concurrency 4 --retries 3

# Bildekonvertering med preset
converter convert --in images/ --out output/ --to png --preset image/web

# Custom bildekonvertering
converter convert --in image.jpg --out output/ --to webp --quality 85 --max-width 1920 --strip-metadata

# Vis tilgjengelige presets
converter presets

# Sjekk LibreOffice-status
converter check-libreoffice

# Sjekk PDF-verktøy
converter check-pdf-tools

# Sjekk Pandoc og LaTeX
converter check-pandoc

# Sjekk OCR-verktøy
converter check-ocr

# OCR-operasjoner
converter ocr --in scanned-document.pdf --out searchable-document.pdf
converter ocr --in image-with-text.png --out extracted-text.txt --lang eng
converter ocr --in document.pdf --out text.txt --quality high

# Preset-operasjoner
converter preset list
converter preset create -n "image/social" -d "Optimalisert for sosiale medier" -t "image" -p "maxWidth=1080;quality=80;stripMetadata=true"
converter preset delete -n "image/social"

# Dokumentkonvertering
converter convert --in document.md --to pdf
converter convert --in webpage.html --to docx
converter convert --in report.pdf --to docx

# PDF-operasjoner
converter pdf --compress document.pdf --preset screen --out compressed.pdf
converter pdf --merge a.pdf b.pdf c.pdf --out merged.pdf
converter pdf --split document.pdf --pages 1-3,5 --out partial.pdf

# Vis PDF-presets
converter pdf-presets

# Vis støttede formater
converter formats

# Vis versjon
converter version
```

**Alternativt** kan du kjøre CLI-en direkte uten å linke:
```bash
node dist/cli.js convert --in image.jpg --out output/ --to png
```

### Støttede formater

#### 📷 Bildeformater
- HEIC, JPG, PNG, WEBP, TIFF, BMP, GIF

#### 📄 Dokumentformater  
- DOCX, PPTX, XLSX, PDF, MD, HTML, RTF, TXT

#### 🎵 Mediaformater
- MP4, MOV, MP3, WAV

### Prosjektstruktur

```
/FileConverter/
  packages/
    core/               # TS-kjerne (CLI + lib)
      src/
        cli.ts          # CLI-entry point
        converter.ts    # Hovedkonverteringslogikk
        file-detector.ts # Filtype-deteksjon
        file-scanner.ts # Mappe-skanning
        logger.ts       # Logging
        types.ts        # TypeScript typer
        index.ts        # Eksporter
        adapters/       # Konverteringsadaptere
          document/     # Dokumentadaptere (Pandoc)
          office/       # Office-adaptere (LibreOffice)
          images/       # Bildeadaptere (Sharp)
          pdf/          # PDF-adaptere (Ghostscript, qpdf)
        utils/          # Hjelpeverktøy
          pandoc-detector.ts # Pandoc/LaTeX-deteksjon
          libreoffice-detector.ts # LibreOffice-deteksjon
          pdf-tools-detector.ts # PDF-verktøy-deteksjon
          ocr-detector.ts # OCR-verktøy-deteksjon
        config/         # Konfigurasjonssystem
          config-manager.ts # Preset og konfig-håndtering
        adapters/       # Konverteringsadaptere
          ocr/          # OCR-adaptere
            ocr-adapter.ts # OCR-håndtering
      dist/             # Bygget kode
      test/             # Tester (unit, integration, e2e)
    gui/                # Tauri + React GUI
      src/              # React-komponenter
        App.tsx         # Hovedkomponent
        App.css         # Styling
      src-tauri/        # Rust backend
        src/
          lib.rs        # Tauri commands
          main.rs       # App entry point
        Cargo.toml      # Rust dependencies
      dist/             # Bygget GUI
  logs/                 # Loggfiler
  .github/workflows/    # CI/CD pipelines
```

### Utvikling

```bash
# Start utviklingsmodus (watch)
npm run dev

# Kjør tester
npm run test                    # Alle tester
npm run test:unit              # Kun unit-tester
npm run test:integration       # Kun integrasjonstester
npm run test:e2e               # Kun E2E-tester
npm run test:coverage          # Med coverage-rapport
npm run test:watch             # Watch-modus
npm run test:all               # Alle tester med rapport

# Lint kode
npm run lint
npm run lint:fix               # Automatisk fiks

# Rydd opp
npm run clean
```

### Logging

Loggfiler lagres i `logs/` mappen:
- `converter.log` - Alle logger
- `error.log` - Kun feil

### CI/CD

Prosjektet bruker GitHub Actions for kontinuerlig integrasjon:

- **Test**: Kjører på alle PR og pushes til main/develop
- **Lint**: Sjekker kodekvalitet med ESLint
- **Build**: Bygger CLI-binærer for Windows, macOS og Linux
- **Release**: Automatisk release på main branch

Se `.github/workflows/ci.yml` for detaljer.

## 🚀 Bolk 9 - Testing, CI/CD og pakking

Dette er niende bolk av FileConverter-prosjektet som implementerer omfattende testing, CI/CD og pakking.

### Funksjoner ✅

- ✅ Unit-tester for adapters (Pandoc, Sharp) - **33 tester totalt**
- ✅ Integrasjonstester med små testfiler (sjekker hash/størrelse)
- ✅ E2E smoke-tester for representative jobber
- ✅ Jest-konfigurasjon med TypeScript-støtte
- ✅ ESLint-konfigurasjon for kodekvalitet
- ✅ GitHub Actions workflow for CI/CD
- ✅ Automatisk bygging av CLI-binærer for Win/macOS/Linux
- ✅ Test coverage og rapportgenerering
- ✅ Lint + test på PR
- ✅ E2E smoke-test: kjør 3 representative jobber

### Test-resultater:
```
Test Suites: 4 passed, 4 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        9.136 s
```

### Akseptansekriterier oppfylt:
- ✅ Unit-tester for adapters
- ✅ Integrasjonstester med små testfiler (sjekker hash/størrelse)
- ✅ GitHub Actions for linting/testing på PR
- ✅ Build CLI binærer for multiple OS
- ✅ E2E smoke-tester (kjører 3 representative jobber)

## 🚀 Bolk 10 - Tauri + React GUI

Dette er tiende bolk av FileConverter-prosjektet som implementerer en moderne GUI-applikasjon med Tauri + React.

### Funksjoner ✅

- ✅ **Drag-and-drop filer/mapper** - Filvelger med moderne UI
- ✅ **Velg "jobbtype"** - Format-velger (bilde→png, docx→pdf, pdf→compress, merge…)
- ✅ **Køvisning med progress** - Viser konverteringsstatus og fremdrift
- ✅ **Detaljer og feillogg** - Omfattende logging og feilhåndtering
- ✅ **"Åpne i mappe"** - Direkte tilgang til output-mapper
- ✅ **"Installer avhengigheter"-veiviser** - Sjekker ImageMagick/LibreOffice/Pandoc/Ghostscript/qpdf
- ✅ **Tekniske punkter** - GUI kaller CLI via Tauri commands
- ✅ **i18n (NB/EN)** - Forberedt for internasjonalisering
- ✅ **Egen "Advanced" fane** - For CLI-flags og avanserte innstillinger

### GUI-funksjoner:

#### **Hovedfunksjoner:**
- **Filvelger** - Velg enkeltfiler eller mapper
- **Format-velger** - Støtte for alle FileConverter-formater
- **Output-mappe** - Velg hvor konverterte filer skal lagres
- **Konverteringsknapp** - Start konvertering med visuell feedback

#### **Dependency-sjekk:**
- **Pandoc** - Dokumentkonvertering
- **LibreOffice** - Office-formater
- **Ghostscript** - PDF-operasjoner
- **qpdf** - PDF-komprimering
- **Installasjonsveiviser** - Lenker til nedlasting

#### **Avanserte funksjoner:**
- **Progress tracking** - Viser konverteringsfremdrift
- **Feilhåndtering** - Detaljerte feilmeldinger
- **Output-åpning** - Åpne mapper direkte fra GUI
- **Responsivt design** - Fungerer på alle skjermstørrelser

### Kommandoer for GUI:
```bash
# Start GUI i utviklingsmodus
npm run gui:dev

# Bygg GUI for produksjon
npm run gui:build
```

### Akseptansekriterier oppfylt:
- ✅ Drag-and-drop filer/mappe
- ✅ Velg "jobbtype" (bilde→png, docx→pdf, pdf→compress, merge…)
- ✅ Køvisning m/progress, detaljer, feillogg, "åpne i mappe"
- ✅ "Installer avhengigheter"-veiviser (sjekk ImageMagick/LibreOffice/Pandoc/Ghostscript/qpdf)
- ✅ Tekniske punkter: GUI kaller CLI (via Tauri commands)
- ✅ i18n (NB/EN) - Forberedt
- ✅ Egen "Advanced" fane for CLI-flags

## Lisens

MIT
