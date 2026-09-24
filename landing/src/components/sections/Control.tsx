import { Bell } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { BUDGETS, BUDGET_ALERT, CATEGORY, DEBT, GOAL, cop } from '@/content/app';
import { Progress, SectionHead } from './shared';

export function Control({ t }: { t: Dictionary['control'] }) {
  const card = 'flex flex-col gap-4 rounded-[20px] border border-line bg-card p-5 sm:rounded-[22px] sm:p-6';
  const goalPct = Math.round((GOAL.saved / GOAL.target) * 100);
  const debtPaid = Math.round(((DEBT.total - DEBT.remaining) / DEBT.total) * 100);

  return (
    <section id="control" className="flex w-full max-w-[1000px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead title={t.title} subtitle={t.subtitle} />

      {/* Notificación real de la alerta de presupuesto */}
      <div className="flex w-full max-w-[440px] items-start gap-3 rounded-[22px] bg-[#2b3038] px-4 py-3.5 shadow-[0_14px_30px_rgba(0,0,0,0.45)]">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand" aria-hidden>
          <Bell size={15} className="text-white" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[11px] text-dim">MyWallet · ahora</span>
          <span className="text-[14px] font-bold">{BUDGET_ALERT.title}</span>
          <span className="text-[13px] text-[#c9d1d9]">{BUDGET_ALERT.body}</span>
        </span>
      </div>

      <div className="grid w-full grid-cols-1 gap-3.5 sm:gap-[18px] md:grid-cols-3">
        <div className={card}>
          <h3 className="text-[15px] font-bold sm:text-base">{t.budget.title}</h3>
          {BUDGETS.map((b) => {
            const cat = CATEGORY[b.key];
            const pct = Math.round((b.spent / b.limit) * 100);
            const over = pct >= 100;
            return (
              <div key={b.key} className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold">
                    {cat.emoji} {cat.name}
                  </span>
                  <span className={`shrink-0 font-mono text-xs font-bold ${over ? 'text-expense' : 'text-dim'}`}>
                    {over ? t.budget.over : `${pct}%`}
                  </span>
                </span>
                <Progress pct={pct} color={over ? 'var(--color-expense)' : cat.accent} />
                <span className="text-xs text-faint">
                  {cop(b.spent)} {t.budget.of} {cop(b.limit)}
                </span>
              </div>
            );
          })}
        </div>

        <div className={card}>
          <h3 className="text-[15px] font-bold sm:text-base">{t.goal.title}</h3>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>
              {GOAL.emoji}
            </span>
            <span className="flex flex-col">
              <span className="font-bold">{GOAL.name}</span>
              <span className="text-xs text-dim">
                {cop(GOAL.saved)} {t.goal.saved}
              </span>
            </span>
          </div>
          <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em] text-income">{goalPct}%</span>
          <Progress pct={goalPct} color="var(--color-income)" />
          <span className="text-xs text-faint">
            {t.goal.of} {cop(GOAL.target)}
          </span>
        </div>

        <div className={card}>
          <h3 className="text-[15px] font-bold sm:text-base">{t.debt.title}</h3>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>
              {DEBT.emoji}
            </span>
            <span className="flex flex-col">
              <span className="font-bold">{DEBT.name}</span>
              <span className="text-xs text-dim">
                {cop(DEBT.monthly)} {t.debt.monthly}
              </span>
            </span>
          </div>
          <span className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">{cop(DEBT.remaining)}</span>
          <Progress pct={debtPaid} color="var(--color-accent)" />
          <span className="text-xs text-faint">
            {t.debt.remaining} · {t.debt.due} {DEBT.dueDay}
          </span>
        </div>
      </div>
    </section>
  );
}
