import { Keyboard, Landmark, ListChecks, Mic, PencilLine, Plus, type LucideIcon } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { WAY_ROWS } from '@/content/app';
import { StackedCards } from '../StackedCards';
import { TxRow } from '../TxRow';
import { HandNote, InlineChip, SectionHead } from './shared';

type Key = keyof typeof WAY_ROWS;
const WAYS: { key: Key; icon: LucideIcon }[] = [
  { key: 'manual', icon: PencilLine },
  { key: 'voice', icon: Mic },
  { key: 'batch', icon: ListChecks },
  { key: 'quick', icon: Keyboard },
  { key: 'bank', icon: Landmark },
];

export function Registro({ t }: { t: Dictionary['registro'] }) {
  return (
    <section id="registro" className="flex w-full max-w-[760px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead
        title={
          <>
            {t.titleA}
            <InlineChip>
              <Plus className="size-[18px] text-accent sm:size-6" strokeWidth={2.6} aria-hidden />
            </InlineChip>
            {t.titleB}
          </>
        }
        subtitle={t.subtitle}
      />
      <StackedCards>
        {WAYS.map(({ key, icon: Icon }) => {
          const item = t.items[key];
          return (
            <article
              key={key}
              className="relative flex w-full max-w-[560px] flex-col gap-4 rounded-[20px] border border-line bg-card px-3.5 pt-3.5 pb-5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] sm:gap-5 sm:rounded-[22px] sm:px-5 sm:pt-5 sm:pb-[26px]"
            >
              <TxRow tx={WAY_ROWS[key]} />
              <div className="flex gap-3.5 pl-1 sm:pl-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <h3 className="text-[17px] font-bold sm:text-[19px]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-dim sm:text-[15px]">{item.desc}</p>
                </div>
              </div>
              {key === 'bank' && (
                <>
                  <p className="pl-[62px] font-hand text-xl leading-tight text-dim lg:hidden">← {t.bankNote}</p>
                  <HandNote className="absolute top-7 left-[calc(100%+24px)] hidden w-[220px] lg:flex">{t.bankNote}</HandNote>
                </>
              )}
            </article>
          );
        })}
      </StackedCards>
    </section>
  );
}
