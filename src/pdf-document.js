export function checkDocumentSignal(signal) {
  if (signal.aborted) throw new DOMException('Conversion cancelled.', 'AbortError');
}

export async function withPdf(file, {signal}, run) {
  const pdfjs = await import('pdfjs-dist');
  const {default: workerUrl} = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  checkDocumentSignal(signal);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()), cMapUrl: '/pdf/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/pdf/standard_fonts/', wasmUrl: '/pdf/wasm/', isEvalSupported: false,
  });
  const cancel = () => { void task.destroy().catch(() => {}); };
  signal.addEventListener('abort', cancel, {once: true});
  try {
    checkDocumentSignal(signal);
    const pdf = await task.promise;
    if (pdf.numPages > 200) throw new Error('This PDF has more than 200 pages. Split it into a smaller document first.');
    return await run(pdf);
  } finally {
    signal.removeEventListener('abort', cancel);
    await task.destroy();
  }
}
