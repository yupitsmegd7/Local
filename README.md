<div align="center">

# 🔄 LOCAL

**Your files. Your browser. Your control.**

Convert documents, images, audio and video — and make room for creativity.

### [🚀 Deployed Site](https://localconverter-flame.vercel.app/)

[![Processing: On Device](https://img.shields.io/badge/Processing-On_Device-14b8a6?style=for-the-badge)](#-privacy-by-design)
[![Batch Limit: 500 MB](https://img.shields.io/badge/Batch_Limit-500_MB-6366f1?style=for-the-badge)](#-batch-conversion)
[![Font Styles: 49](https://img.shields.io/badge/Font_Styles-49-ec4899?style=for-the-badge)](#-creative-toolbox)
[![Emojis: 1,923](https://img.shields.io/badge/Emojis-1%2C923-f59e0b?style=for-the-badge)](#-creative-toolbox)

[Features](#-at-a-glance) · [Tools](#-creative-toolbox) · [Formats](#-supported-conversions) · [Quick Start](#-run-locally)

</div>

---

> **Drop files → choose a format → convert → download.**
> File processing happens on your device, with no conversion server receiving your files.

## ✨ At a glance

| | What you can do |
| --- | --- |
| 📄 **Documents** | Move between PDF, Word DOCX and plain text. |
| 🖼️ **Images** | Convert image formats, resize pictures and create documents. |
| 🎵 **Audio & video** | Convert media, extract audio, or place audio in MP4/MOV with a plain video track. |
| 📚 **Batch workflow** | Drag and drop or select multiple files, then download individual results or a ZIP. |
| 🧰 **Six creative tools** | Resize, frame, create image documents, extract text, style writing and browse emojis. |
| 🔒 **Local processing** | Work in temporary browser memory; download the results you choose to keep. |

**500 MB combined input limit** · **49 font choices** · **1,923 emojis** · **English + Hindi OCR**

The batch limit is 500,000,000 bytes. Per-file limits and device memory constraints still apply.

## 🧰 Creative toolbox

| Tool | Make it yours |
| --- | --- |
| 📐 **Image size** | Set dimensions, lock proportions and adjust JPEG/WebP quality. |
| 🖼️ **Image frames** | Preview 1:1, 4:5, 16:9, 9:16, 16:4 and 3:2 formats; fit or crop before export. |
| 📑 **Images to documents** | Arrange multiple images into an A4 PDF or Word DOCX. |
| 🔎 **Image to text** | Extract English/Hindi writing, edit the result and download TXT. |
| ✍️ **Font studio** | Write with 49 fonts, size, bold, italic and color controls; export DOCX or TXT. |
| 😄 **Emoji library** | Search 1,923 emojis, explore categories and copy your favorites. |

<details>
<summary><strong>Tool details, limits and export behavior</strong></summary>

1. **Image size:** pixel dimensions, original-aspect lock, JPEG/PNG/WebP export, lossy quality control and actual output-size feedback. Limits: 8,000 pixels per dimension and 32 megapixels. Input up to 30 MB.
2. **Image frames:** live 1:1, 4:5, 16:9, 9:16, 16:4 and 3:2 previews. Fill/crop or fit, horizontal/vertical positioning, background color and matching framed export.
3. **Images to documents:** multiple images become one PDF or DOCX, one image per A4 page. Reorder before export. Combined input up to 500 MB; 30 MB per image. Images are fitted without cropping and scaled to at most 2,000 pixels along the longest edge. DOCX embeds images rather than extracting editable text.
4. **Image to text:** real local OCR for English, Hindi or both. Editable text and TXT export. Tesseract uses `cacheMethod: 'none'`; image bytes and recognized text are never uploaded. Best for printed text; handwritten notes can be inaccurate. Closing or switching tools releases local data. Cancelling during engine initialization may allow its already-started asset download to finish before termination.
5. **Font studio:** a writing area, 49 font choices (45 bundled font families), 12–72px type, bold, italic, color and DOCX/TXT output. Fonts are referenced, not embedded, in Word exports. No autosave.
6. **Emoji library:** 1,923 unique categorized emojis, label/tag search, category filtering and click-to-copy. A selectable text fallback appears if clipboard permissions are unavailable. Emoji rendering depends on OS support.

</details>

## 🔁 Batch conversion

Add multiple files through the system picker or drop area. Additional selections append to the queue. Additions are validated atomically; an invalid file or a total exceeding 500 MB is rejected without discarding existing selections. The per-file limits in the table above are in decimal MB. Conversion is sequential; each row has its own result or failure. Stop preserves completed results and allows remaining files to resume. Output-format and quality changes invalidate old results. Duplicate output names are made unique in ZIP downloads. Clear files releases the app's file references and result URLs, and stops the active conversion. ZIP preparation itself cannot be interrupted, but clearing or leaving invalidates its result.

## 📦 Supported conversions

| Category | Inputs | Outputs | Limit |
| --- | --- | --- | --- |
| Documents | PDF, DOCX, TXT, MD | PDF, DOCX, TXT | 20 MB; PDF up to 200 pages; 500,000 characters |
| Images | JPG, JPEG, PNG, WebP, BMP | PNG, JPG, WebP, PDF | 30 MB; 32 megapixels; static images |
| Audio | MP3, WAV, FLAC, AAC, M4A, OGG, OPUS, AIFF, AIF, WMA | MP3, WAV, FLAC, OGG, M4A, MP4, MOV | 100 MB |
| Video | MP4, MOV, WebM, MKV, AVI, M4V, MPEG, MPG | MP4, MOV, WebM, MP3, WAV | 100 MB |

<details>
<summary><strong>Format support, document fidelity and conversion limits</strong></summary>

Formats are allowlisted by extension, then decoded by the real conversion engine; malformed or unsupported internal codecs produce an error. No promise of universal codec support. MP4/MOV output from audio adds a plain 1280×720 navy video track. Media conversions have a five-minute processing timeout. Browser memory and device speed may impose lower practical limits.

Documents use readable text with a clean, simplified layout. Embedded images, exact styling and table structure are not retained. DOCX means modern Microsoft Word format; legacy DOC is unsupported. PDF input requires selectable text; no password removal. Use Tools → Image to text for OCR of image files. Standard Latin PDF output is searchable; other writing systems use browser-shaped page images and are not searchable. Image-to-PDF also creates an image-based page. Markdown is treated as plain text. Quality settings apply to lossy media and JPEG/WebP, not lossless PNG/WAV/FLAC.

</details>

## 🔒 Privacy by design

- No conversion API, backend upload endpoint, database, analytics, cookies, service worker, localStorage or IndexedDB.
- File bytes are read with browser File APIs and processed in memory. Neither names nor contents are included in network requests.
- Media uses a temporary FFmpeg WebAssembly worker and in-memory filesystem. The worker is terminated after success, failure or cancellation.
- Output object URLs are revoked when replaced or cleared. Clear files removes input and output references. The browser controls garbage collection; this is not a secure RAM erasure guarantee.
- A download is saved only when the user selects Download. Original files are untouched.
- All code, fonts supplied for PDF reading and media engine assets are served from the same site. The browser may cache application code. Hosting may retain ordinary request logs; these do not contain selected file data.
- Hosting access controls are separate from the converter; the app itself has no sign-up or account database.

## 🚀 Run locally

Requires Node.js 22+ and npm.

```sh
git clone https://github.com/yupitsmegd7/Local.git
cd Local
npm ci
node scripts/prepare-assets.mjs
npm run dev
```

```sh
npm run build
npm run preview
```

Deploy the `dist` directory on a static host with WebAssembly and module-worker support. Serve from HTTPS or localhost. No API keys or environment secrets are needed. OCR models for English and Hindi, OCR workers, fonts and emoji data are also bundled and served from the same site. `_headers` supplies security headers on hosts that support that convention. The single-threaded engine does not require cross-origin isolation. The approximately 31 MB WebAssembly binary is split into two static assets to respect per-asset hosting size limits; the browser joins them in memory.

> **Use `npm run build` for deployment.** It prepares the local media engines and OCR assets before Vite builds the site. No API keys or database setup are required.

## 🧱 How it works

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | Application shell, category navigation, dialogs and optional WebMCP integration. |
| `src/Converter.jsx` | File queue, conversion controls, cancellation and downloads. |
| `src/batch.js` | Batch validation and unique filenames for ZIP downloads. |
| `src/catalog.js` | Advertised input/output formats and size limits. |
| `src/convert.js` | Text extraction, document creation and image conversion. |
| `src/media.js` | FFmpeg worker lifecycle and media encoder settings. |
| `src/Tools.jsx` | The six-tool interface and Font Studio. |
| `src/image-tools.js` | Canvas operations, image limits and image-document generation. |
| `src/ocr.js` | Local OCR, progress updates and worker cleanup. |
| `src/emojis.jsx` | Searchable, categorized emoji library. |
| `scripts/prepare-assets.mjs` | Bundles runtime assets for delivery from the same site. |

The optional page-scoped WebMCP interface exposes supported options and output selection. It never returns filenames or file contents and never starts a conversion or download.

## 🧪 Verification

Run the included checks after installing dependencies and preparing assets:

```sh
node scripts/test-batch.mjs
node scripts/test-ocr.mjs
node scripts/smoke-media.mjs
npm run build
```

<details>
<summary><strong>Previously completed checks and known limitations</strong></summary>

- Production build completed successfully.
- Browser: the actual interface generated PDF and DOCX from a UTF-8 text sample, and MP4 with a video preview from a WAV sample.
- The packaged WebAssembly engine encoded MP3, WAV, FLAC, OGG, M4A, MP4 and MOV from a generated tone, and converted MP4 to WebM. Reproduce with `node scripts/smoke-media.mjs`.
- These are representative samples, not a guarantee for all codecs or documents. Exact layout preservation, OCR of PDF documents, very large individual files and secure memory wiping are out of scope.
- This test browser did not expose the optional document-scoped WebMCP tools, so that integration could not be verified live.
- `node scripts/test-batch.mjs`: exact 500 MB boundary, oversized/empty/unsupported selections, per-file limits and duplicate ZIP names.
- `node scripts/test-ocr.mjs`: reads the included PNG fixture using bundled language data with cache disabled; recovers all three expected lines.
- Image-engine check: 600×210 resize, 1600×400 frame, invalid dimensions rejected, two-page PDF, DOCX with two embedded images, temporary image URLs released.
- Browser: multiple-selection queue, two TXT-to-PDF conversions, successful ZIP preparation, six-tool navigation, and browser-local OCR recovering all expected sample text at 95% engine confidence checked. A preview-only `crypto.randomUUID` availability issue was found and fixed with session-local queue IDs.
- Production build succeeds. Optional WebMCP remains unavailable in the test browser.

</details>

## 💙 Built with open source

Local uses open-source libraries that run in the browser. It does not send selected files to a third-party conversion service or require users to install a separate conversion application.

| Role | Libraries |
| --- | --- |
| Interface & build | React, Vite, Lucide |
| Documents | Mammoth, docx, jsPDF, PDF.js |
| Audio & video | FFmpeg.wasm |
| Text recognition | Tesseract.js |
| Downloads, fonts & emojis | JSZip, Fontsource, Emojibase |

Bundled library license notices are included in `public/notices`; asset preparation copies additional notices. FFmpeg component and codec licenses apply independently of the wrapper license.

[FFmpeg.wasm documentation](https://ffmpegwasm.netlify.app/docs/overview/) · [Source & core build recipes](https://github.com/ffmpegwasm/ffmpeg.wasm) · [FFmpeg source](https://ffmpeg.org/download.html)

## 📄 License

Project source is available under the [MIT License](LICENSE). Third-party libraries and font assets retain their respective licenses.

---

<div align="center">

**A small toolbox for everyday files.**

[🚀 Deployed Site](https://localconverter-flame.vercel.app/) · [Report an issue](https://github.com/yupitsmegd7/Local/issues)

</div>
