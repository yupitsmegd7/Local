# Local — Private file converter

A browser-only converter for documents, images, audio and video. Drag and drop or select multiple files, choose an output format, convert sequentially and download individual results or a ZIP. The combined input limit is 500 MB (500,000,000 bytes), while the existing per-file limits still apply.

## Privacy architecture

- No conversion API, backend upload endpoint, database, analytics, cookies, service worker, localStorage or IndexedDB.
- File bytes are read with browser File APIs and processed in memory. Neither names nor contents are included in network requests.
- Media uses a temporary FFmpeg WebAssembly worker and in-memory filesystem. The worker is terminated after success, failure or cancellation.
- Output object URLs are revoked when replaced or cleared. Clear files removes input and output references. The browser controls garbage collection; this is not a secure RAM erasure guarantee.
- A download is saved only when the user selects Download. Original files are untouched.
- All code, fonts supplied for PDF reading and media engine assets are served from the same site. The browser may cache application code. Hosting may retain ordinary request logs; these do not contain selected file data.
- Hosting access controls are separate from the converter; the app itself has no sign-up or account database.

## Supported conversions

| Category | Inputs | Outputs | Limit |
| --- | --- | --- | --- |
| Documents | PDF, DOCX, TXT, MD | PDF, DOCX, TXT | 20 MB; PDF up to 200 pages; 500,000 characters |
| Images | JPG, JPEG, PNG, WebP, BMP | PNG, JPG, WebP, PDF | 30 MB; 32 megapixels; static images |
| Audio | MP3, WAV, FLAC, AAC, M4A, OGG, OPUS, AIFF, AIF, WMA | MP3, WAV, FLAC, OGG, M4A, MP4, MOV | 100 MB |
| Video | MP4, MOV, WebM, MKV, AVI, M4V, MPEG, MPG | MP4, MOV, WebM, MP3, WAV | 100 MB |

Formats are allowlisted by extension, then decoded by the real conversion engine; malformed or unsupported internal codecs produce an error. No promise of universal codec support. MP4/MOV output from audio adds a plain 1280×720 navy video track. Media conversions have a five-minute processing timeout. Browser memory and device speed may impose lower practical limits.

Documents use readable text with a clean, simplified layout. Embedded images, exact styling and table structure are not retained. DOCX means modern Microsoft Word format; legacy DOC is unsupported. PDF input requires selectable text; no password removal. Use Tools → Image to text for OCR of image files. Standard Latin PDF output is searchable; other writing systems use browser-shaped page images and are not searchable. Image-to-PDF also creates an image-based page. Markdown is treated as plain text. Quality settings apply to lossy media and JPEG/WebP, not lossless PNG/WAV/FLAC.

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
node scripts/prepare-assets.mjs
npm run dev
```

```sh
npm run build
npm run preview
```

Deploy the `dist` directory on a static host with WebAssembly and module-worker support. Serve from HTTPS or localhost. No API keys or environment secrets are needed. OCR models for English and Hindi, OCR workers, fonts and emoji data are also bundled and served from the same site. `_headers` supplies security headers on hosts that support that convention. The single-threaded engine does not require cross-origin isolation. The approximately 31 MB WebAssembly binary is split into two static assets to respect per-asset hosting size limits; the browser joins them in memory.

## Implementation

- React and Vite: interface, state and static build.
- `src/catalog.js`: advertised input/output types and size limits.
- `src/convert.js`: text extraction, document creation and browser-canvas image conversion.
- `src/media.js`: FFmpeg worker lifecycle and encoder options.
- `src/main.jsx`: selection, conversion, cancel, downloads, clear files, accessible dialogs and optional WebMCP tools.
- `scripts/prepare-assets.mjs`: bundles same-origin runtime assets.

The optional page-scoped WebMCP interface exposes supported options and output selection. It never returns names or file contents and never initiates a conversion or download.

## Third-party code, not third-party conversion services

The site intentionally does not send files to any third-party service or require an installed conversion app. It does include open-source software: React, Vite, Lucide, Mammoth, docx, jsPDF, PDF.js, FFmpeg.wasm, Tesseract.js, JSZip, Fontsource and Emojibase. A literal ban on all third-party code would exclude these libraries and is not what this implementation claims.

FFmpeg.wasm documentation: https://ffmpegwasm.netlify.app/docs/overview/
FFmpeg.wasm source and core build recipes: https://github.com/ffmpegwasm/ffmpeg.wasm
FFmpeg source: https://ffmpeg.org/download.html
Bundled library license notices are copied into `public/notices` during asset preparation. FFmpeg's component and codec licenses apply independently of the wrapper license; consult upstream before redistributing modified engine binaries.

## Verification performed

- Production build completed successfully.
- Browser: the actual interface generated PDF and DOCX from a UTF-8 text sample, and MP4 with a video preview from a WAV sample.
- The packaged WebAssembly engine encoded MP3, WAV, FLAC, OGG, M4A, MP4 and MOV from a generated tone, and converted MP4 to WebM. Reproduce with `node scripts/smoke-media.mjs`.
- These are representative samples, not a guarantee for all codecs or documents. Exact layout preservation, OCR of PDF documents, very large individual files and secure memory wiping are out of scope.
- This test browser did not expose the optional document-scoped WebMCP tools, so that integration could not be verified live.


## Batch conversion

Add multiple files through the system picker or drop area. Additional selections append to the queue. Additions are validated atomically; an invalid file or a total exceeding 500 MB is rejected without discarding existing selections. The per-file limits in the table above are in decimal MB. Conversion is sequential; each row has its own result or failure. Stop preserves completed results and allows remaining files to resume. Output-format and quality changes invalidate old results. Duplicate output names are made unique in ZIP downloads. Clear files releases the app's file references and result URLs, and stops the active conversion. ZIP preparation itself cannot be interrupted, but clearing or leaving invalidates its result.

## Tools

1. **Image size:** pixel dimensions, original-aspect lock, JPEG/PNG/WebP export, lossy quality control and actual output-size feedback. Limits: 8,000 pixels per dimension and 32 megapixels. Input up to 30 MB.
2. **Image frames:** live 1:1, 4:5, 16:9, 9:16, 16:4 and 3:2 previews. Fill/crop or fit, horizontal/vertical positioning, background color and matching framed export.
3. **Images to documents:** multiple images become one PDF or DOCX, one image per A4 page. Reorder before export. Combined input up to 500 MB; 30 MB per image. Images are fitted without cropping and scaled to at most 2,000 pixels along the longest edge. DOCX embeds images rather than extracting editable text.
4. **Image to text:** real local OCR for English, Hindi or both. Editable text and TXT export. Tesseract uses `cacheMethod: 'none'`; image bytes and recognized text are never uploaded. Best for printed text; handwritten notes can be inaccurate. Closing or switching tools releases local data. Cancelling during engine initialization may allow its already-started asset download to finish before termination.
5. **Font studio:** a writing area, 49 font choices (45 bundled font families), 12–72px type, bold, italic, color and DOCX/TXT output. Fonts are referenced, not embedded, in Word exports. No autosave.
6. **Emoji library:** 1,923 unique categorized emojis, label/tag search, category filtering and click-to-copy. A selectable text fallback appears if clipboard permissions are unavailable. Emoji rendering depends on OS support.

## Updated verification

- `node scripts/test-batch.mjs`: exact 500 MB boundary, oversized/empty/unsupported selections, per-file limits and duplicate ZIP names.
- `node scripts/test-ocr.mjs`: reads the included PNG fixture using bundled language data with cache disabled; recovers all three expected lines.
- Image-engine check: 600×210 resize, 1600×400 frame, invalid dimensions rejected, two-page PDF, DOCX with two embedded images, temporary image URLs released.
- Browser: multiple-selection queue, two TXT-to-PDF conversions, successful ZIP preparation, six-tool navigation, and browser-local OCR recovering all expected sample text at 95% engine confidence checked. A preview-only `crypto.randomUUID` availability issue was found and fixed with session-local queue IDs.
- Production build succeeds. Optional WebMCP remains unavailable in the test browser.
- Publishing the updated version is pending approval; the previous published version remains live.
