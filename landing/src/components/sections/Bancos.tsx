import { ArrowRight, Ban, Check } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { BANKS, BANK_NOTIFS } from '@/content/app';
import { TxRow } from '../TxRow';
import { InlineChip, SectionHead } from './shared';

/** Notificación de Android como la ve el usuario en la bandeja. */
function Notification({ n }: { n: (typeof BANK_NOTIFS)[number] }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-[22px] bg-[#2b3038] px-4 py-3.5 text-left shadow-[0_14px_30px_rgba(0,0,0,0.45)]">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold"
        style={{ background: n.color, color: n.bank === 'Bancolombia' ? '#1a1a1a' : '#fff' }}
        aria-hidden
      >
        {n.bank[0]}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] text-dim">
          {n.bank} · {n.time}
        </span>
        <span className="truncate text-[14px] font-bold">{n.title}</span>
        <span className="text-[13px] leading-snug text-[#c9d1d9]">{n.text}</span>
      </span>
    </div>
  );
}

export function Bancos({ t }: { t: Dictionary['bancos'] }) {
  return (
    <section id="bancos" className="flex w-full max-w-[1000px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead
        title={
          <>
            {t.titleA}
            <InlineChip>
              <span className="text-[26px] font-extrabold text-accent sm:text-[40px]">{t.chip}</span>
            </InlineChip>
            {t.titleB}
          </>
        }
        subtitle={t.subtitle}
      />

      <ul className="flex w-full flex-col gap-5 sm:gap-6">
        {BANK_NOTIFS.map((n) => (
          <li key={n.text} className="grid grid-cols-1 items-center gap-2.5 md:grid-cols-[1fr_40px_1fr] md:gap-4">
            <Notification n={n} />
            <ArrowRight className="mx-auto rotate-90 text-faint md:rotate-0" size={20} aria-hidden />
            {n.detected ? (
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 pl-1 font-mono text-[11px] font-bold tracking-[0.08em] text-income uppercase">
                  <Check size={13} strokeWidth={3} aria-hidden />
                  {t.detected}
                </span>
                <TxRow tx={n.detected} />
              </div>
            ) : (
              <span className="flex items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-dim">
                <Ban size={16} className="shrink-0 text-faint" aria-hidden />
                {t.ignored}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex w-full max-w-[760px] flex-col items-center gap-4 rounded-[22px] border border-line bg-card p-5 text-center sm:p-7">
        <h3 className="text-base font-bold sm:text-lg">{t.listTitle}</h3>
        <ul className="flex flex-wrap justify-center gap-2">
          {BANKS.map((b) => (
            <li key={b} className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold">
              {b}
            </li>
          ))}
        </ul>
        <p className="max-w-[560px] text-sm leading-relaxed text-dim">{t.listNote}</p>
      </div>
    </section>
  );
}
