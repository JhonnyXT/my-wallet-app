import { ChartColumn } from 'lucide-react';
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
          <div role="img" aria-label={t.chartTitle} className="flex h-[200px] items-end justify-between gap-2.5">
            {CHART.map((c) => {
              const cat = CATEGORY[c.key];
              return (
                <span key={c.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono text-[10px] text-faint sm:text-[11px]">{short(c.amount)}</span>
                  <span className="w-full rounded-[10px]" style={{ height: `${(c.amount / chartMax) * 130}px`, background: cat.accent }} />
                  <span className="text-lg leading-none">{cat.emoji}</span>
                </span>
              );
            })}
          </div>
          <span className="-mt-1 self-center -rotate-2 font-hand text-lg text-dim">↑ {t.chartHint}</span>
        </div>

        {/* Ranking de promedio mensual (`app/reports.tsx`) */}
        <div className={card}>
          <span className="text-[15px] font-bold sm:text-base">{t.avgTitle}</span>
          <ol className="flex flex-col gap-3.5">
            {AVERAGES.map((a, i) => {
              const cat = CATEGORY[a.key];
              return (
                <li key={a.key} className="flex items-center gap-3">
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
