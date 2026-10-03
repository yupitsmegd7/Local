import {withPdf, checkDocumentSignal as check} from './pdf-document';
import './fonts';
import './document-fonts';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const MAX_PAGES = 200;
const MAX_OUTPUT_BYTES = 150_000_000;

// PDF has page geometry, not the Word document's original paragraphs and tables.
// Full-page drawings preserve that geometry without pretending to recover editability.
export async function pdfToVisualDocx(file, options) {
  const {signal, onStatus} = options;
  const {Document, Packer, Paragraph, ImageRun, SectionType, HorizontalPositionRelativeFrom,
    VerticalPositionRelativeFrom} = await import('docx');
  return withPdf(file, options, async pdf => {
    const sections = [];
    let totalBytes = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      check(signal);
      onStatus(`Preserving PDF page ${n} of ${pdf.numPages}…`);
      const page = await pdf.getPage(n);
      const original = page.getViewport({scale: 1});
      // Word limits page dimensions to 22 inches.
      if (Math.max(original.width, original.height) > 1584) {
        throw new Error('A PDF page exceeds Word’s 22-inch page limit. Resize that page before converting.');
      }
      const viewport = page.getViewport({scale: Math.min(2, Math.sqrt(8_000_000 / (original.width * original.height)))});
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      let render;
      const cancel = () => render?.cancel();
      signal.addEventListener('abort', cancel, {once: true});
      try {
        render = page.render({canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff'});
        await render.promise;
        check(signal);
        const blob = await pngBlob(canvas);
        totalBytes += blob.size;
        if (totalBytes > MAX_OUTPUT_BYTES) throw new Error('The layout-preserving Word file is too large. Convert a smaller range of PDF pages.');
        const image = new ImageRun({
          type: 'png', data: new Uint8Array(await blob.arrayBuffer()),
          transformation: {width: original.width * 4 / 3, height: original.height * 4 / 3},
          floating: {horizontalPosition: {relative: HorizontalPositionRelativeFrom.PAGE, offset: 0},
            verticalPosition: {relative: VerticalPositionRelativeFrom.PAGE, offset: 0},
            behindDocument: true, allowOverlap: true, layoutInCell: false},
        });
        sections.push({properties: {type: SectionType.NEXT_PAGE,
          page: {size: {width: Math.round(original.width * 20), height: Math.round(original.height * 20)},
            margin: {top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0}}},
          children: [new Paragraph({spacing: {before: 0, after: 0}, children: [image]})]});
      } finally {
        signal.removeEventListener('abort', cancel);
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
      await tick();
    }
    check(signal);
    onStatus('Packaging the original page layouts into Word…');
    const result = await Packer.toBlob(new Document({creator: '', sections}));
    check(signal);
    return result;
  });
}

async function pngBlob(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The browser could not render this page. Try a smaller document.');
  return blob;
}

// Drop external relationships and HTML chunks before rendering. The isolated frame
// also blocks remote document resources, scripts, forms and network connections.
async function localDocx(file, signal) {
  const {default: JSZip} = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files);
  if (entries.length > 5000 || entries.reduce((n, e) => n + (e._data?.uncompressedSize || 0), 0) > 100_000_000) {
    throw new Error('This DOCX expands beyond the local rendering limit. Use a smaller document.');
  }
  if (!zip.file('word/document.xml')) throw new Error('This is not a valid Word DOCX document.');
  // Make next-page section boundaries explicit. The HTML renderer otherwise can
  // group the last portrait article and the first landscape article on one page.
  const main = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
  if (main.querySelector('parsererror')) throw new Error('The DOCX contains damaged document content.');
  const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  for (const section of [...main.getElementsByTagNameNS(wordNs, 'sectPr')]) {
    const props = section.parentElement, paragraph = props?.parentElement;
    if (props?.localName !== 'pPr' || paragraph?.localName !== 'p') continue;
    const type = section.getElementsByTagNameNS(wordNs, 'type')[0]?.getAttributeNS(wordNs, 'val');
    if (type === 'continuous') continue;
    const existing = [...paragraph.getElementsByTagNameNS(wordNs, 'br')].some(br => br.getAttributeNS(wordNs, 'type') === 'page');
    if (!existing) {
      const run = main.createElementNS(wordNs, 'w:r'), br = main.createElementNS(wordNs, 'w:br');
      br.setAttributeNS(wordNs, 'w:type', 'page'); run.append(br); paragraph.append(run);
    }
  }
  zip.file('word/document.xml', new XMLSerializer().serializeToString(main));
  for (const entry of entries) {
    check(signal);
    if (!entry.name.endsWith('.rels')) continue;
    const xml = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('The DOCX contains damaged relationships.');
    for (const relationship of [...xml.getElementsByTagNameNS('*', 'Relationship')]) {
      const target = relationship.getAttribute('Target') || '';
      if (relationship.getAttribute('TargetMode')?.toLowerCase() === 'external' || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) relationship.remove();
    }
    zip.file(entry.name, new XMLSerializer().serializeToString(xml));
  }
  return zip.generateAsync({type: 'arraybuffer', compression: 'STORE'});
}

async function fontFaceCss() {
  const faces = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
        // Stylesheets here belong to the application, never to the input document.
        const urls = [...rule.style.getPropertyValue('src').matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)];
        const asset = urls.find(match => match[1].includes('.woff2')) || urls[0];
        if (!asset) continue;
        const resolved = new URL(asset[1], sheet.href || location.href);
        if (resolved.origin !== location.origin) continue;
        faces.push((async () => {
          const response = await fetch(resolved.href);
          if (!response.ok) throw new Error('A bundled font could not load. Reload the site and try again.');
          const blob = await response.blob();
          const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
          const declarations = rule.style.cssText.replace(/src:[^;]+;/, `src:url("${data}");`);
          const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
          const aliases = {Carlito: 'Calibri', Caladea: 'Cambria', Arimo: 'Arial', Tinos: 'Times New Roman', Cousine: 'Courier New'};
          const alias = aliases[family];
          const localFace = alias + (rule.style.fontWeight === '700' ? ' Bold' : '') + (rule.style.fontStyle === 'italic' ? ' Italic' : '');
          // Prefer an installed original face; use a compatible bundled family
          // when it is missing. Embedded document faces are inserted afterwards.
          const fallback = alias ? declarations.replace(/font-family:[^;]+;/, `font-family:"${alias}";`).replace(/src:/, `src:local("${localFace}"),`) : '';
          return `@font-face{${declarations}}${fallback ? `\n@font-face{${fallback}}` : ''}`;
        })());
      }
    } catch { /* Cross-origin application stylesheets are deliberately ignored. */ }
  }
  return (await Promise.all(faces)).join('\n');
}

async function renderingFrame(signal) {
  // Only public application font assets are fetched, before the input document
  // enters this frame. The document itself receives no network access at all.
  const fonts = await fontFaceCss();
  check(signal);
  const frame = document.createElement('iframe');
  frame.title = 'Temporary document rendering';
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1800px;height:2400px;border:0;pointer-events:none;';
  const loaded = new Promise((resolve, reject) => {
    frame.onload = resolve;
    frame.onerror = () => reject(new Error('Could not initialize the document renderer.'));
  });
  frame.srcdoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; font-src data: blob:; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'"></head><body></body></html>`;
  document.body.append(frame);
  try {
    await loaded;
    check(signal);
    const doc = frame.contentDocument;
    const style = doc.createElement('style');
    style.textContent = `html,body{margin:0;padding:0;background:white;} ${fonts}`;
    doc.head.append(style);
    return frame;
  } catch (error) { frame.remove(); throw error; }
}

function pageFits(page) {
  const view = page.ownerDocument.defaultView;
  const style = view.getComputedStyle(page);
  const rect = page.getBoundingClientRect();
  const footer = page.querySelector(':scope > footer');
  const bottom = rect.bottom - parseFloat(style.paddingBottom) - (footer ? footer.getBoundingClientRect().height + parseFloat(view.getComputedStyle(footer).marginBottom || 0) : 0);
  return [...page.querySelectorAll(':scope > article, :scope > ol')].every(el => el.getBoundingClientRect().bottom <= bottom + 1);
}

function splitParagraph(block, page) {
  if (block.tagName !== 'P' || !block.textContent.length || block.querySelector('img,svg,math')) return null;
  const doc = block.ownerDocument;
  const length = block.textContent.length;
  const original = block.cloneNode(true);
  function fragment(start, end) {
    const walker = doc.createTreeWalker(original, 4);
    let offset = 0, node, first, last;
    while ((node = walker.nextNode())) {
      if (!first && start <= offset + node.length) first = [node, start - offset];
      if (end <= offset + node.length) { last = [node, end - offset]; break; }
      offset += node.length;
    }
    const range = doc.createRange();
    range.setStart(...first); range.setEnd(...last);
    return range.cloneContents();
  }
  let low = 0, high = length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    block.replaceChildren(fragment(0, middle));
    if (pageFits(page)) low = middle; else high = middle - 1;
  }
  if (!low || low === length) { block.replaceChildren(...original.childNodes); return null; }
  const space = original.textContent.lastIndexOf(' ', low - 1);
  if (space > 0 && low - space < 40) low = space + 1;
  // Do not split a surrogate pair between pages.
  if (/[\uD800-\uDBFF]/.test(original.textContent[low - 1])) low--;
  if (!low) { block.replaceChildren(...original.childNodes); return null; }
  block.replaceChildren(fragment(0, low));
  const rest = original.cloneNode(false);
  rest.append(fragment(low, length));
  rest.style.textIndent = '0';
  return rest;
}

function splitTable(table, page) {
  if (table.tagName !== 'TABLE' || table.querySelector('[rowspan]:not([rowspan="1"])')) return null;
  const rows = [...table.rows];
  if (rows.length < 2) return null;
  const remainder = table.cloneNode(true);
  const moved = [];
  while (table.rows.length > 1 && !pageFits(page)) {
    moved.unshift(table.rows[table.rows.length - 1]);
    moved[0].remove();
  }
  if (!pageFits(page)) { for (const row of moved) (table.tBodies[0] || table).append(row); return null; }
  for (const row of [...remainder.rows]) row.remove();
  const body = remainder.tBodies[0] || remainder;
  for (const row of moved) body.append(row);
  return moved.length ? remainder : null;
}

// docx-preview honors saved/manual page breaks. This additionally handles content
// that overflows a page when Word did not save pagination hints.
async function paginate(container, signal) {
  const pages = [];
  for (const original of [...container.querySelectorAll(':scope > section.docx')]) {
    const template = original.cloneNode(true);
    const sourceArticles = [...original.querySelectorAll(':scope > article')];
    const height = parseFloat(original.ownerDocument.defaultView.getComputedStyle(original).minHeight) || 1122.52;
    const width = original.getBoundingClientRect().width || 793.7;
    if (width > 3000 || height > 3000) throw new Error('This Word page is too large to render locally. Use a smaller page size.');
    for (const article of template.querySelectorAll(':scope > article')) article.remove();
    let page, article;
    const newPage = () => {
      if (pages.length >= MAX_PAGES) throw new Error('The rendered document exceeds 200 pages. Split it into a smaller document.');
      page = template.cloneNode(true);
      page.style.height = `${height}px`; page.style.minHeight = `${height}px`; page.style.width = `${width}px`;
      original.before(page);
      pages.push(page);
    };
    const addArticle = source => {
      article = source.cloneNode(false); article.style.flexShrink = '0';
      page.insertBefore(article, page.querySelector(':scope > ol, :scope > footer'));
    };
    newPage();
    for (const source of sourceArticles) {
      addArticle(source);
      const remaining = [...source.childNodes];
      while (remaining.length) {
        check(signal);
        const block = remaining.shift();
        article.append(block);
        if (!pageFits(page)) {
          const rest = block.nodeType === 1 && (splitTable(block, page) || splitParagraph(block, page));
          if (rest) remaining.unshift(rest);
          else {
            block.remove();
            if (!page.querySelector('article > *')) throw new Error('A picture, merged table row or drawing cannot fit within the page margins. Resize that element in Word before converting.');
            remaining.unshift(block);
          }
          newPage(); addArticle(source);
        }
        if (pages.length % 10 === 0) await tick();
      }
    }
    original.remove();
  }
  return pages;
}

export async function docxToVisualPdf(file, {signal, onStatus}) {
  const [{renderAsync}, {default: html2canvas}, {jsPDF}] = await Promise.all([
    import('docx-preview'), import('html2canvas'), import('jspdf'),
  ]);
  check(signal);
  onStatus('Reading document styles, tables and embedded images…');
  const data = await localDocx(file, signal);
  check(signal);
  const frame = await renderingFrame(signal);
  try {
    const doc = frame.contentDocument;
    const content = doc.createElement('div'), styles = doc.createElement('div');
    doc.body.append(styles, content);
    await renderAsync(data, content, styles, {inWrapper: false, ignoreWidth: false, ignoreHeight: false,
      ignoreFonts: false, breakPages: true, ignoreLastRenderedPageBreak: false, useBase64URL: true,
      renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true,
      renderAltChunks: false, experimental: false});
    check(signal);
    for (const el of content.querySelectorAll('[href]')) el.removeAttribute('href');
    await Promise.all([...content.querySelectorAll('img')].map(img => img.decode().catch(() => {
      throw new Error('An embedded image could not be rendered. Re-save the picture as PNG or JPEG in Word.');
    })));
    await doc.fonts.ready;
    check(signal);
    const pages = await paginate(content, signal);
    if (!pages.length) throw new Error('No renderable pages were found in this DOCX.');
    let pdf, totalBytes = 0;
    for (let i = 0; i < pages.length; i++) {
      check(signal);
      onStatus(`Preserving Word page ${i + 1} of ${pages.length}…`);
      const page = pages[i], rect = page.getBoundingClientRect();
      const canvas = await html2canvas(page, {scale: 2, backgroundColor: '#ffffff', logging: false,
        useCORS: false, allowTaint: false, imageTimeout: 15000, width: rect.width, height: rect.height,
        windowWidth: 1800, windowHeight: 2400});
      try {
        check(signal);
        const bytes = new Uint8Array(await (await pngBlob(canvas)).arrayBuffer());
        totalBytes += bytes.length;
        if (totalBytes > MAX_OUTPUT_BYTES) throw new Error('The rendered PDF is too large. Convert a smaller document.');
        const size = [rect.width * .75, rect.height * .75], orientation = size[0] > size[1] ? 'landscape' : 'portrait';
        if (!pdf) pdf = new jsPDF({unit: 'pt', format: size, orientation, compress: true});
        else pdf.addPage(size, orientation);
        pdf.addImage(bytes, 'PNG', 0, 0, size[0], size[1], undefined, 'FAST');
      } finally { canvas.width = canvas.height = 0; }
      await tick();
    }
    check(signal);
    return pdf.output('blob');
  } finally { frame.remove(); }
}
