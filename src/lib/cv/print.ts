import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { CvDocument } from './types';

function sanitizeFileName(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  return normalized || 'cv';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCvRoot(doc: CvDocument) {
  const root = document.querySelector<HTMLElement>(
    `[data-cv-print-root="${doc.id}"]`,
  );

  if (!root) {
    throw new Error('Không tìm thấy vùng CV để xuất PDF.');
  }

  return root;
}

async function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }

          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        }),
    ),
  );
}

async function waitForStyleSheets(doc: Document) {
  const links = Array.from(
    doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );

  await Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          try {
            if (link.sheet) {
              resolve();
              return;
            }
          } catch {
            // ignore cross-origin stylesheet access errors
          }

          const done = () => resolve();
          link.addEventListener('load', done, { once: true });
          link.addEventListener('error', done, { once: true });

          window.setTimeout(done, 1500);
        }),
    ),
  );
}

function collectHeadMarkup() {
  return Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((node) => node.outerHTML)
    .join('\n');
}

async function waitForFonts(targetDocument: Document) {
  try {
    await (targetDocument as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    // ignore
  }
}

async function waitForLayout() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function generateCvPdfBlob(doc: CvDocument): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Chỉ có thể xuất PDF trên trình duyệt.');
  }

  const root = getCvRoot(doc);

  await waitForFonts(document);
  await waitForImages(root);
  await waitForLayout();

  const canvas = await html2canvas(root, {
    scale: Math.max(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage('a4', 'portrait');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const blob = pdf.output('blob');
  return blob;
}

export async function downloadCvPdfDocument(doc: CvDocument) {
  const blob = await generateCvPdfBlob(doc);
  const fileName = `${sanitizeFileName(doc.name)}.pdf`;
  downloadBlob(blob, fileName);
}

export async function printCvDocument(doc: CvDocument) {
  if (typeof window === 'undefined') return;

  const root = getCvRoot(doc);

  const printWindow = window.open('', '_blank', 'width=900,height=1200');

  if (!printWindow) {
    throw new Error('Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup.');
  }

  await waitForFonts(document);
  await waitForImages(root);

  const headMarkup = collectHeadMarkup();
  const fileName = sanitizeFileName(doc.name);

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(fileName)}</title>
        ${headMarkup}
        <style>
          @page {
            size: A4;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .cv-print-shell {
            width: 794px;
            min-height: 1123px;
            margin: 0 auto;
            overflow: hidden;
            background: #ffffff;
          }

          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              background: #ffffff;
            }

            .cv-print-shell {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="cv-print-shell">${root.innerHTML}</div>
      </body>
    </html>
  `);
  printWindow.document.close();

  await waitForStyleSheets(printWindow.document);
  await waitForFonts(printWindow.document);

  const printRoot =
    printWindow.document.querySelector<HTMLElement>('.cv-print-shell');

  if (printRoot) {
    await waitForImages(printRoot);
  }

  await new Promise((resolve) => window.setTimeout(resolve, 300));

  printWindow.focus();
  printWindow.print();

  window.setTimeout(() => {
    printWindow.close();
  }, 500);
}