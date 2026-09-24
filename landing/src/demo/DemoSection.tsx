'use client';

import type { Dictionary } from '@/i18n/config';
import { cop } from '@/content/app';
import { HandNote } from '@/components/sections/shared';
import { categoryColor, categoryName } from './data';
import { DemoPhone } from './DemoPhone';
import { Narrator } from './Narrator';
import { monthSpentBy, monthTotals, useDemo, type DemoApi } from './useDemo';

type T = Dictionary['demo'];

const bal = (n: number) => (n < 0 ? '-' : '') + cop(n).replace('$ ', '$');

/** Panel derecho: presupuestos y totales del mes, leyendo el mismo estado que el teléfono. */
function LiveWidgets({ api, t }: { api: DemoApi; t: T }) {
  const { state, dispatch } = api;
  const tot = monthTotals(state.txs);
  const spent = monthSpentBy(state.txs);
  const budgets = Object.entries(state.budgets).map(([emoji, limit]) => {
    const s = spent[emoji] ?? 0;
    return { emoji, limit, spent: s, pct: Math.round((s / limit) * 100) };
  });
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-3xl border border-line bg-card p-[22px]">
        <span className="text-[17px] font-extrabold">{t.budgetsTitle}</span>
        {budgets.map((b) => {
          const over = b.pct >= 100;
          return (
            <div key={b.emoji} className="flex flex-col gap-1.5">
              <span className="flex justify-between text-sm">
                <span className="font-semibold">
                  {b.emoji} {categoryName(b.emoji)}
                </span>
                <b className={over ? 'text-expense' : b.pct >= 80 ? 'text-warn' : 'text-dim'}>{b.pct}%</b>
              </span>
              <span className="block h-2 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.min(100, b.pct)}%`, background: over ? 'var(--color-expense)' : categoryColor(b.emoji).accent }}
                />
              </span>
              <span className="text-xs text-faint">
                {cop(b.spent)} {t.of} {cop(b.limit)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5 rounded-3xl border border-line bg-card p-[22px] text-sm">
        <span className="text-[17px] font-extrabold">{t.monthTitle}</span>
        <span className="flex justify-between">
          <span className="text-dim">{t.expenses}</span>
          <b className="text-expense">
            {bal(tot.expense)}
          </b>
        </span>
        <span className="flex justify-between">
          <span className="text-dim">{t.incomes}</span>
          <b className="text-income">
            {bal(tot.income)}
          </b>
        </span>
        <span className="flex justify-between">
          <span className="text-dim">{t.movements}</span>
          <b>{tot.count}</b>
        </span>
      </div>
      <button type="button" onClick={() => dispatch({ type: 'reset' })} className="h-10 cursor-pointer self-end text-[13px] text-faint underline hover:text-dim">
        {t.reset}
      </button>
    </div>
  );
}

/** Portada interactiva: el teléfono con MyWallet funcionando al centro, el
 * narrador a la izquierda y los datos en vivo a la derecha, todos leyendo el
 * mismo estado. Solo en memoria: al recargar vuelve a los datos de ejemplo. */
export function DemoSection({ t }: { t: T }) {
  const api = useDemo();
  return (
    <section id="demo" className="w-full max-w-[1260px] scroll-mt-20 px-5 pt-6 pb-16 sm:pb-24">
      <div className="grid grid-cols-1 items-start justify-items-center gap-8 lg:grid-cols-[minmax(0,370px)_380px_minmax(0,320px)] lg:justify-between lg:gap-10">
        <div className="order-2 flex w-full max-w-[440px] flex-col gap-2 lg:order-1 lg:pt-8">
          <HandNote className="hidden self-end lg:flex" flip>
            {t.narratorNote}
          </HandNote>
          <Narrator api={api} t={t} />
        </div>
        <div className="order-1 lg:order-2">
          <DemoPhone api={api} />
        </div>
        <div className="order-3 hidden w-full flex-col gap-2 lg:flex lg:pt-8">
          <HandNote className="self-start">{t.liveNote}</HandNote>
          <LiveWidgets api={api} t={t} />
        </div>
      </div>
    </section>
  );
}
