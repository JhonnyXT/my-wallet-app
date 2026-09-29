// ─── Exportar / importar movimientos en CSV ──────────────────────────────────
// Formato propio de MyWallet. Importar acepta también el CSV del "Exportar datos" anterior
// (id,fecha,tipo,descripcion,categoria,monto,metodo_pago,tags). Montos en pesos, siempre
// positivos: el tipo (Gasto/Ingreso) da el signo (en la base, gasto > 0 e ingreso < 0).

export const CSV_HEADERS = [
  "fecha",
  "tipo",
  "descripcion",
  "categoria_emoji",
  "categoria",
  "monto",
  "cuenta",
  "etiquetas",
  "pago",
] as const;

export interface CsvTransaction {
  date: string;
  amount: number;
  description: string;
  category_emoji: string;
  tags: string;
  payment_method: string;
  paid_by: string;
}

/** Fila leída de un CSV, lista para insertar (el llamador resuelve cuenta y quién pagó). */
export interface ParsedCsvRow {
  /** ISO local "YYYY-MM-DDTHH:mm:ss.000" (sin zona, como `localISOString`). */
  date: string;
  /** Con signo de la base: gasto > 0, ingreso < 0. */
  amount: number;
  description: string;
  categoryEmoji: string;
  tags: string[];
  /** Tal cual venía: id o nombre del método de pago. */
  account: string;
  /** Tal cual venía: nombre de quien pagó ("" = tú). */
  payer: string;
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseTags(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* cae al formato de texto */
    }
  }
  return trimmed.split(/\s+/).filter((t) => t.startsWith("#"));
}

export function transactionsToCsv(
  txs: CsvTransaction[],
  helpers: {
    categoryName: (emoji: string) => string;
    accountName: (id: string) => string;
    /** Nombre de quien pagó; "" para ti. */
    payerName: (paidBy: string) => string;
  },
): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const t of txs) {
    lines.push(
      [
        t.date,
        t.amount > 0 ? "Gasto" : "Ingreso",
        t.description,
        t.category_emoji,
        helpers.categoryName(t.category_emoji),
        String(Math.round(Math.abs(t.amount))),
        helpers.accountName(t.payment_method),
        parseTags(t.tags).join(" "),
        helpers.payerName(t.paid_by),
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

/** Separa un CSV en filas y celdas, respetando comillas (con "" como comilla escapada). */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function parseDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, h = "12", mi = "00", s = "00"] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getMonth() !== Number(mo) - 1) return null;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.000`;
}

function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/[$\s]/g, "");
  if (!s) return null;
  // "4.50"/"4,5" = decimales; "1.250.000"/"1,250,000" = separadores de miles.
  const value = /^\d+([.,]\d{1,2})?$/.test(s)
    ? parseFloat(s.replace(",", "."))
    : parseInt(s.replace(/[.,]/g, ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Lee un CSV exportado por MyWallet (formato actual o anterior). */
export function parseTransactionsCsv(text: string): {
  rows: ParsedCsvRow[];
  invalid: number;
  recognized: boolean;
} {
  const [header, ...body] = splitCsv(text);
  if (!header) return { rows: [], invalid: 0, recognized: false };
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const idx = {
    date: col("fecha"),
    type: col("tipo"),
    desc: col("descripcion"),
    emoji: col("categoria_emoji") >= 0 ? col("categoria_emoji") : col("categoria"),
    amount: col("monto"),
    account: col("cuenta") >= 0 ? col("cuenta") : col("metodo_pago"),
    tags: col("etiquetas") >= 0 ? col("etiquetas") : col("tags"),
    payer: col("pago"),
  };
  if (idx.date < 0 || idx.type < 0 || idx.amount < 0) {
    return { rows: [], invalid: body.length, recognized: false };
  }

  const rows: ParsedCsvRow[] = [];
  let invalid = 0;
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "") : "");
  for (const r of body) {
    const date = parseDate(cell(r, idx.date));
    const amount = parseAmount(cell(r, idx.amount));
    const type = cell(r, idx.type).trim().toLowerCase();
    if (!date || amount === null || (type !== "gasto" && type !== "ingreso")) {
      invalid++;
      continue;
    }
    rows.push({
      date,
      amount: type === "gasto" ? amount : -amount,
      description: cell(r, idx.desc).trim() || (type === "gasto" ? "Gasto" : "Ingreso"),
      categoryEmoji: cell(r, idx.emoji).trim() || "💸",
      tags: parseTags(cell(r, idx.tags)),
      account: cell(r, idx.account).trim(),
      payer: cell(r, idx.payer).trim(),
    });
  }
  return { rows, invalid, recognized: true };
}

/** Clave para no importar dos veces el mismo movimiento. */
export function duplicateKey(t: { date: string; amount: number; description: string }): string {
  return `${t.date.slice(0, 19)}|${t.amount}|${t.description.trim()}`;
}
