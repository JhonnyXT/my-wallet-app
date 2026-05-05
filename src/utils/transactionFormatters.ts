// ─── Helpers de formato para transacciones ───────────────────────────────────

import { EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";

const MONTH_ABBR = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
] as const;

export function resolveCategory(
  emoji: string,
  userCats: { emoji: string; name: string }[],
  goals: { emoji: string; name: string }[],
): string {
  const u = userCats.find((c) => c.emoji === emoji);
  if (u) return u.name.charAt(0).toUpperCase() + u.name.slice(1).toLowerCase();
  const g = goals.find((g) => g.emoji === emoji);
  if (g) return g.name.charAt(0).toUpperCase() + g.name.slice(1).toLowerCase();
  const n = EMOJI_TO_CATEGORY_NAME[emoji];
  if (n) return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  return "General";
}

export function formatDetailDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDetailTime(dateStr: string): string {
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "p.m." : "a.m.";
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

export function formatDetailAmount(amount: number): string {
  return `$ ${Math.round(Math.abs(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function formatBalance(amount: number): string {
  return `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function extractTagsFromTx(tx: { description?: string | null; tags?: string | null }): string[] {
  if (tx.tags) {
    try {
      const parsed = JSON.parse(tx.tags);
      if (Array.isArray(parsed)) return parsed.map((t: string) => t.toLowerCase());
    } catch { /* fallback */ }
  }
  const matches = (tx.description ?? "").match(/#(\w+)/g);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}
