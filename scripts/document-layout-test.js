import {convertFile} from '../src/convert';
import {withPdf} from '../src/pdf-document';
import * as word from 'docx';
import JSZip from 'jszip';

const status = document.getElementById('status');
const log = message => { status.textContent += '\n' + message; };
const assert = (ok, message) => { if (!ok) throw new Error(message); log('PASS: ' + message); };
const defaults = () => ({signal: new AbortController().signal, onStatus: message => { document.title = message; }});
const paragraph = (text, props = {}) => new word.Paragraph({children: [new word.TextRun({text, font: 'Lora', size: 24})], ...props});
const cell = (text, fill = 'FFFFFF') => new word.TableCell({shading: {fill}, children: [paragraph(text)]});

async function fixture() {
  const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 130;
  const context = canvas.getContext('2d'); context.fillStyle = '#dbeafe'; context.fillRect(0, 0, 400, 130);
  context.fillStyle = '#e84872'; context.fillRect(18, 18, 90, 94); context.fillStyle = '#255edb'; context.beginPath(); context.arc(180, 65, 47, 0, Math.PI * 2); context.fill();
  const image = new Uint8Array(await (await new Promise(r => canvas.toBlob(r))).arrayBuffer());
  return new File([await word.Packer.toBlob(new word.Document({sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1100, bottom: 1100, left: 1000, right: 1000}}},
    headers: {default: new word.Header({children: [paragraph('LOCAL | DOCUMENT DESIGN', {alignment: word.AlignmentType.RIGHT})]})},
    footers: {default: new word.Footer({children: [paragraph('A styled document · Local', {alignment: word.AlignmentType.CENTER})]})},
    children: [new word.Paragraph({children: [new word.TextRun({text: 'Design should travel.', font: 'Lora', size: 56, bold: true, color: '245CDD'})], spacing: {after: 280}}),
      new word.Paragraph({children: [new word.TextRun({text: 'Bold text · ', bold: true, size: 26}), new word.TextRun({text: 'italic text · ', italics: true, size: 26}), new word.TextRun({text: 'underlined & coral', underline: {}, color: 'E84872', size: 26})], spacing: {after: 220}}),
      new word.Table({width: {size: 100, type: word.WidthType.PERCENTAGE}, rows: [new word.TableRow({children: [cell('Feature', 'BDEBE5'), cell('Expected', 'BDEBE5')]}), new word.TableRow({children: [cell('Typography'), cell('Fonts and color')]}), new word.TableRow({children: [cell('Structure'), cell('Table borders and spacing')]})]}),
      new word.Paragraph({children: [new word.ImageRun({type: 'png', data: image, transformation: {width: 300, height: 97.5}})], spacing: {before: 300, after: 200}}),
      paragraph('First checklist item', {bullet: {level: 0}}), paragraph('Second checklist item', {bullet: {level: 0}}),
      paragraph('PAGE TWO — explicit page break', {pageBreakBefore: true}), paragraph('The original page boundary must remain visible.')]
  }, {properties: {page: {size: {width: 16838, height: 11906}, margin: {top: 1000, bottom: 1000, left: 1000, right: 1000}}}, children: [paragraph('LANDSCAPE PAGE THREE'), paragraph('Wide page dimensions stay wide.')]}]}))], 'styled-layout.docx');
}

async function displayPdf(file, label) {
  const title = document.createElement('h2'); title.textContent = label; document.getElementById('pages').append(title);
  const dimensions = [];
  await withPdf(file, defaults(), async pdf => {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n), viewport = page.getViewport({scale: 1});
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
      document.getElementById('pages').append(canvas); dimensions.push([viewport.width, viewport.height]); page.cleanup();
    }
  });
  return dimensions;
}

document.getElementById('run').onclick = async () => {
  document.getElementById('run').disabled = true; status.textContent = 'Running real browser document conversions…';
  try {
    const input = await fixture(), inputBytes = new Uint8Array(await input.arrayBuffer());
    const original = await convertFile(input, 'documents', 'docx', defaults());
    assert(new Uint8Array(await original.arrayBuffer()).every((b, i) => b === inputBytes[i]), 'DOCX-to-DOCX keeps original bytes');
    const output = await convertFile(input, 'documents', 'pdf', defaults());
    const pdf = new File([output], 'styled.pdf');
    const dims = await displayPdf(pdf, 'Styled Word → PDF');
    assert(dims.length === 3, 'Saved page break and section produce three pages');
    assert(dims[2][0] > dims[2][1], 'Landscape page dimensions preserved');
    const docx = await convertFile(pdf, 'documents', 'docx', defaults());
    const zip = await JSZip.loadAsync(await docx.arrayBuffer());
    const xml = await zip.file('word/document.xml').async('string');
    assert((xml.match(/<w:drawing>/g) || []).length === dims.length, 'PDF-to-Word retains one full-page drawing per page, including scanned PDFs');
    const sizes = [...xml.matchAll(/<w:pgSz w:w="(\d+)" w:h="(\d+)"/g)];
    assert(sizes.length === dims.length && sizes.every((m, i) => Math.abs(+m[1] - dims[i][0] * 20) < 2 && Math.abs(+m[2] - dims[i][1] * 20) < 2), 'PDF-to-Word retains page sizes');
    const media = Object.values(zip.files).filter(f => /word\/media\/.*\.png$/.test(f.name));
    assert(media.length === 3, 'Word package includes all three page images');
    const imageBytes = await Promise.all(media.map(f => f.async('uint8array')));
    await withPdf(pdf, defaults(), async document => {
      for (let n = 1; n <= document.numPages; n++) {
        const page = await document.getPage(n), viewport = page.getViewport({scale: 2});
        const canvas = window.document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff'}).promise;
        const expected = new Uint8Array(await (await new Promise(r => canvas.toBlob(r, 'image/png'))).arrayBuffer());
        assert(imageBytes.some(bytes => bytes.length === expected.length && bytes.every((b, i) => b === expected[i])), `PDF page ${n} image is preserved exactly in Word`);
        canvas.width = canvas.height = 0; page.cleanup();
      }
    });
    const copied = await convertFile(pdf, 'documents', 'pdf', defaults());
    assert(copied.size === pdf.size && await copied.text() === await pdf.text(), 'PDF-to-PDF keeps original bytes');
    const controller = new AbortController(); controller.abort();
    let cancelled = false;
    try { await convertFile(input, 'documents', 'pdf', {signal: controller.signal, onStatus: () => {}}); } catch (error) { cancelled = error.name === 'AbortError'; }
    assert(cancelled, 'Cancelled conversion stops');
    assert(!document.querySelector('iframe[title="Temporary document rendering"]'), 'Temporary document frame is removed');
    const flowing = new File([await word.Packer.toBlob(new word.Document({sections: [{children: Array.from({length: 75}, (_, i) => paragraph(`Paragraph ${i + 1}: Long documents must continue onto additional pages without losing their content.`, {spacing: {after: 180}}))}]}))], 'flow.docx');
    const flowPdf = new File([await convertFile(flowing, 'documents', 'pdf', defaults())], 'flow.pdf');
    await withPdf(flowPdf, defaults(), async pdf => assert(pdf.numPages >= 3, 'Content without stored page breaks paginates across multiple pages'));
    const tallTable = new File([await word.Packer.toBlob(new word.Document({sections: [{children: [new word.Table({rows: Array.from({length: 90}, (_, i) => new word.TableRow({children: [cell(`Row ${i + 1}`, i % 2 ? 'FFFFFF' : 'BDEBE5'), cell('The table continues across pages.')] }))}), paragraph('AFTER THE TABLE')]}]}))], 'table.docx');
    const tablePdf = new File([await convertFile(tallTable, 'documents', 'pdf', defaults())], 'table.pdf');
    const tableDims = await displayPdf(tablePdf, 'Long table → PDF');
    assert(tableDims.length > 1, 'Long tables split between rows across multiple pages');
    const longParagraph = new File([await word.Packer.toBlob(new word.Document({sections: [{children: [paragraph('A long styled paragraph must continue without clipping. '.repeat(240))]}]}))], 'paragraph.docx');
    const paragraphPdf = new File([await convertFile(longParagraph, 'documents', 'pdf', defaults())], 'paragraph.pdf');
    await withPdf(paragraphPdf, defaults(), async pdf => assert(pdf.numPages > 1, 'A long paragraph splits across pages'));
    const textInput = new File(['Editable heading\nSecond line'], 'sample.txt');
    const textPdf = new File([await convertFile(textInput, 'documents', 'pdf', defaults())], 'text.pdf');
    const editable = await convertFile(textPdf, 'documents', 'docx', {...defaults(), documentMode: 'editable'});
    const editableZip = await JSZip.loadAsync(await editable.arrayBuffer());
    assert((await editableZip.file('word/document.xml').async('string')).includes('Editable heading'), 'Optional editable-text conversion still works');
    const text = await convertFile(input, 'documents', 'txt', defaults());
    assert((await text.text()).includes('Design should travel.'), 'Plain TXT conversion still works');
    const running = new AbortController(); let stopped = false;
    try { await convertFile(input, 'documents', 'pdf', {signal: running.signal, onStatus: s => { if (s.startsWith('Preserving Word')) running.abort(); }}); }
    catch (error) { stopped = error.name === 'AbortError'; }
    assert(stopped && !document.querySelector('iframe[title="Temporary document rendering"]'), 'Cancellation during rendering cleans up the isolated frame');
    document.title = 'PASS — Document layout checks'; log('ALL CHECKS PASSED');
  } catch (error) { document.title = 'FAIL — Document layout checks'; log('FAIL: ' + error.message + '\n' + error.stack); }
  finally { document.getElementById('run').disabled = false; }
};
