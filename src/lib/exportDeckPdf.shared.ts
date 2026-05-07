export type ExportDeckPdfCard = {
  front_text: string | null;
  back_text: string | null;
};

export type ExportDeckPdfArgs = {
  title: string;
  description: string | null;
  cards: ExportDeckPdfCard[];
  emptyMessage?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function sanitizeFileName(title: string): string {
  return (title || "deck")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "deck";
}

export function buildDeckPdfHtml({ title, description, cards, emptyMessage }: ExportDeckPdfArgs): string {
  const cardItems = cards
    .map(
      (card, index) => `
        <div class="card">
          <div class="card-index">${index + 1}</div>
          <div class="card-front">${escapeHtml(card.front_text ?? "")}</div>
          <div class="card-back">${escapeHtml(card.back_text ?? "")}</div>
        </div>
      `,
    )
    .join("");

  const desc = (description ?? "").trim();
  const emptyLabel = (emptyMessage ?? "Ця дошка поки що немає карток").trim();

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; padding: 32px; background: #ffffff;">
      <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700;">${escapeHtml(title || "")}</h1>
      ${desc ? `<p style="margin: 0 0 24px; font-size: 14px; color: #4b5563; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(desc)}</p>` : ""}
      ${cards.length === 0
        ? `<p style="margin: 0; font-size: 15px; color: #6b7280;">${escapeHtml(emptyLabel)}</p>`
        : `<div>${cardItems}</div>`}
      <style>
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .card-index {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .card-front {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
          white-space: pre-wrap;
        }
        .card-back {
          font-size: 14px;
          color: #374151;
          white-space: pre-wrap;
        }
      </style>
    </div>
  `;
}
