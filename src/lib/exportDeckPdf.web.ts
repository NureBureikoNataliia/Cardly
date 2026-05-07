import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import type { ExportDeckPdfArgs, ExportDeckPdfCard } from "./exportDeckPdf.shared";
import { sanitizeFileName } from "./exportDeckPdf.shared";

const PAGE_MARGIN = 32;
const BLOCK_GAP = 10;
const RENDER_WIDTH = 800;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function renderHtmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  const node = document.createElement("div");
  node.style.position = "fixed";
  node.style.left = "-99999px";
  node.style.top = "0";
  node.style.width = `${RENDER_WIDTH}px`;
  node.style.background = "#ffffff";
  node.style.color = "#111827";
  node.style.fontFamily = "Arial, sans-serif";
  node.innerHTML = html;
  document.body.appendChild(node);
  try {
    return await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
  } finally {
    if (node.parentNode) node.parentNode.removeChild(node);
  }
}

function buildHeaderHtml(title: string, description: string | null): string {
  const desc = (description ?? "").trim();
  return `
    <div>
      <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700;">${escapeHtml(title || "")}</h1>
      ${desc ? `<p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(desc)}</p>` : ""}
    </div>
  `;
}

function buildEmptyCardsHtml(message: string): string {
  return `
    <p style="margin: 0; font-size: 15px; color: #6b7280;">${escapeHtml(message)}</p>
  `;
}

function buildCardHtml(card: ExportDeckPdfCard, index: number): string {
  return `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;">
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 600;">${index + 1}</div>
      <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 8px; white-space: pre-wrap;">${escapeHtml(card.front_text ?? "")}</div>
      <div style="font-size: 14px; color: #374151; white-space: pre-wrap;">${escapeHtml(card.back_text ?? "")}</div>
    </div>
  `;
}

export async function exportDeckPdf(args: ExportDeckPdfArgs): Promise<void> {
  const { title, description, cards } = args;
  const fileName = sanitizeFileName(title);
  const emptyMessage = (args.emptyMessage ?? "Ця дошка поки що немає карток").trim();

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - PAGE_MARGIN * 2;
  const usableHeight = pageHeight - PAGE_MARGIN * 2;

  let cursorY = PAGE_MARGIN;

  const placeCanvas = (canvas: HTMLCanvasElement) => {
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > usableHeight) {
      // Rare: block taller than a single page — slice the source canvas.
      const pxPerPage = Math.floor((usableHeight * canvas.width) / imgWidth);
      let sourceY = 0;

      if (cursorY > PAGE_MARGIN) {
        pdf.addPage();
        cursorY = PAGE_MARGIN;
      }

      while (sourceY < canvas.height) {
        const sliceHeightPx = Math.min(pxPerPage, canvas.height - sourceY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) break;
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );
        const sliceImgHeight = (sliceHeightPx * imgWidth) / canvas.width;
        pdf.addImage(
          sliceCanvas.toDataURL("image/png"),
          "PNG",
          PAGE_MARGIN,
          cursorY,
          imgWidth,
          sliceImgHeight,
        );
        sourceY += sliceHeightPx;
        if (sourceY < canvas.height) {
          pdf.addPage();
          cursorY = PAGE_MARGIN;
        } else {
          cursorY += sliceImgHeight + BLOCK_GAP;
        }
      }
      return;
    }

    if (cursorY + imgHeight > pageHeight - PAGE_MARGIN && cursorY > PAGE_MARGIN) {
      pdf.addPage();
      cursorY = PAGE_MARGIN;
    }

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", PAGE_MARGIN, cursorY, imgWidth, imgHeight);
    cursorY += imgHeight + BLOCK_GAP;
  };

  const headerCanvas = await renderHtmlToCanvas(buildHeaderHtml(title, description));
  placeCanvas(headerCanvas);
  cursorY += 8;

  if (cards.length === 0) {
    const emptyCanvas = await renderHtmlToCanvas(buildEmptyCardsHtml(emptyMessage));
    placeCanvas(emptyCanvas);
    pdf.save(`${fileName}.pdf`);
    return;
  }

  for (let i = 0; i < cards.length; i++) {
    const cardCanvas = await renderHtmlToCanvas(buildCardHtml(cards[i], i));
    placeCanvas(cardCanvas);
  }

  pdf.save(`${fileName}.pdf`);
}
