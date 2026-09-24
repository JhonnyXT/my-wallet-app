'use client';

import { ChartColumn, X } from 'lucide-react';
import { useState } from 'react';
import type { Dictionary } from '@/i18n/config';
import { AVERAGES, CATEGORY, CHART, TREND, cop } from '@/content/app';
import { InlineChip, SectionHead } from './shared';

/** Monto corto para etiquetas de gráfica: 486.000 → "486k", 1.386.400 → "1,4M". */
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : `${Math.round(n / 1000)}k`);

export function Promedios({ t }: { t: Dictionary['promedios'] }) {
  const chartMax = Math.max(...CHART.map((c) => c.amount));
  const avgMax = Math.max(...AVERAGES.map((a) => a.avg));
  const trendMax = Math.max(...TREND.map((m) => m.expense));
  const card = 'flex flex-col gap-4 rounded-[20px] border border-line bg-card p-5 sm:rounded-[22px] sm:p-7';
  // Tap en una columna: como en la app, filtra por esa categoría (aquí la
  // resalta en las dos tarjetas y compara el mes con su promedio).
  const [selected, setSelected] = useState<keyof typeof CATEGORY | null>(null);
  const sel = selected ? CHART.find((c) => c.key === selected) : undefined;
  const selAvg = selected ? AVERAGES.find((a) => a.key === selected) : undefined;
  const diff = sel && selAvg ? Math.round(((sel.amount - selAvg.avg) / selAvg.avg) * 100) : null;

  return (
    <section id="promedios" className="flex w-full max-w-[860px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead
        title={
          <>
            {t.titleA}
            <InlineChip>
              <ChartColumn className="size-[18px] text-accent sm:size-6" aria-hidden />
            </InlineChip>
            {t.titleB}
          </>
        }
        subtitle={t.subtitle}
      />

      <div className="grid w-full grid-cols-1 gap-3.5 sm:gap-[18px] md:grid-cols-2">
        {/* Gráfica de categorías del mes (`CategoryChart.tsx`) */}
        <div className={card}>
          <span className="text-[15px] font-bold sm:text-base">{t.chartTitle}</span>
          <div className="flex h-[200px] items-end justify-between gap-2.5">
            {CHART.map((c) => {
              const cat = CATEGORY[c.key];
              const on = selected === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${cat.name}: ${cop(c.amount)}`}
                  onClick={() => setSelected(on ? null : c.key)}
                  className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-2 transition-opacity duration-200 ${selected && !on ? 'opacity-30' : ''}`}
                >
                  <span className={`font-mono text-[10px] sm:text-[11px] ${on ? 'font-bold text-ink' : 'text-faint'}`}>{short(c.amount)}</span>
                  <span
                    className="w-full rounded-[10px] transition-transform duration-200 hover:scale-y-[1.03]"
                    style={{ height: `${(c.amount / chartMax) * 130}px`, background: cat.accent, transformOrigin: 'bottom' }}
                  />
                  <span className="text-lg leading-none">{cat.emoji}</span>
                </button>
              );
            })}
          </div>
          {sel && selected ? (
            <div key={selected} className="flex animate-row-in items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">
              <span className="min-w-0">
                <b>
                  {CATEGORY[selected].emoji} {t.thisMonth}: {cop(sel.amount)}
                </b>
                {diff !== null && (
                  <span className={`block text-xs ${diff > 0 ? 'text-expense' : 'text-income'}`}>
                    {Math.abs(diff)}% {diff > 0 ? t.vsAverage.above : t.vsAverage.below}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t.clearFilter}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim hover:bg-line hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <span className="-mt-1 self-center -rotate-2 font-hand text-lg text-dim">↑ {t.chartHint}</span>
          )}
        </div>

        {/* Ranking de promedio mensual (`app/reports.tsx`) */}
        <div className={card}>
          <span className="text-[15px] font-bold sm:text-base">{t.avgTitle}</span>
          <ol className="flex flex-col gap-3.5">
            {AVERAGES.map((a, i) => {
              const cat = CATEGORY[a.key];
              const dim = selected !== null && selected !== a.key;
              return (
                <li key={a.key} className={`flex items-center gap-3 transition-opacity duration-200 ${dim ? 'opacity-30' : ''}`}>
                  <span className="w-4 font-mono text-xs text-faint">{i + 1}</span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: cat.tint }} aria-hidden>
                    {cat.emoji}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{cat.name}</span>
                      <span className="shrink-0 font-mono text-xs font-bold">
                        {cop(a.avg)}
                        <span className="font-normal text-faint">{t.perMonth}</span>
                      </span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full" style={{ width: `${(a.avg / avgMax) * 100}%`, background: cat.accent }} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Tendencia mensual */}
        <div className={`${card} md:col-span-2`}>
          <span className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold sm:text-base">{t.trendTitle}</span>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-dim">{t.trendRange}</span>
          </span>
          <div role="img" aria-label={`${t.trendTitle}: ${t.trendRange}`} className="flex h-[190px] items-end justify-around gap-3 sm:gap-5">
            {TREND.map((m, i) => (
              <span key={m.month} className="flex w-full max-w-[64px] flex-col items-center gap-2">
                <span className="font-mono text-[10px] text-faint sm:text-[11px]">{short(m.expense)}</span>
                <span
                  className={`w-full rounded-[10px] ${i === TREND.length - 1 ? 'bg-accent' : 'bg-surface-2'}`}
                  style={{ height: `${(m.expense / trendMax) * 130}px` }}
                />
                <span className="text-xs font-semibold text-dim">{m.month}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
