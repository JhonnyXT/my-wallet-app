import Image from 'next/image';
import type { Dictionary, Locale } from '@/i18n/config';
import { BUDGETS, CATEGORY, DEBT, GOAL, cop } from '@/content/app';
import { WaitlistForm } from '../WaitlistForm';
import { PhoneMock } from '../PhoneMock';
import { HandNote, Progress } from './shared';

const widgetBox = 'flex flex-col gap-3.5 rounded-[28px] border border-line bg-card px-[22px] py-5 text-left shadow-[0_30px_60px_rgba(0,0,0,0.6)]';

export function Hero({ t, locale }: { t: Dictionary; locale: Locale }) {
  const goalPct = Math.round((GOAL.saved / GOAL.target) * 100);
  const debtPaid = Math.round(((DEBT.total - DEBT.remaining) / DEBT.total) * 100);
  return (
    <section id="top" className="flex w-full scroll-mt-10 flex-col items-center px-5 pt-5 text-center sm:pt-16">
      <div className="relative mb-[22px] size-[84px] sm:mb-7 sm:size-28">
        <div className="absolute -top-8 -left-8 size-[148px] rounded-full bg-[radial-gradient(circle,rgba(23,150,254,0.38)_0%,rgba(23,150,254,0)_65%)] sm:-top-10 sm:-left-10 sm:size-48" />
        <Image
          src="/img/mywallet-icon.png"
          alt={t.hero.iconAlt}
          width={112}
          height={112}
          priority
          className="relative size-[84px] sm:size-28"
        />
      </div>
      <h1 className="text-[46px] leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-[88px] sm:leading-[1.04]">
        {t.hero.title1}
        <br />
        <span className="text-mute">{t.hero.title2}</span>
      </h1>
      <p className="mt-[18px] max-w-[580px] text-[17px] leading-relaxed text-dim sm:mt-[26px] sm:text-xl">{t.hero.subtitle}</p>
      <div id="avisame" className="mt-[26px] flex w-full scroll-mt-24 justify-center sm:mt-8">
        <WaitlistForm t={t.waitlist} locale={locale} />
      </div>
      <p className="mt-1 text-[13px] leading-normal text-faint sm:mt-3.5 sm:text-sm">
        {t.hero.finePrint}
        {' · '}
        <a href="#privacidad" className="text-dim underline hover:text-ink">
          {t.hero.privacyLink}
        </a>
      </p>

      <div className="relative mt-10 flex w-full max-w-[1100px] flex-col items-center gap-5 sm:mt-16 lg:h-[820px]">
        {/* Widget izquierdo: presupuesto por categoría */}
        <div className="absolute top-[140px] left-2.5 hidden lg:block">
          <HandNote className="absolute -top-[74px] left-8 w-[260px]" flip>
            {t.hero.widgetsNote}
          </HandNote>
          <div className={`${widgetBox} w-[320px]`}>
            <span className="text-[17px] font-extrabold">Presupuestos</span>
            {BUDGETS.map((b) => {
              const cat = CATEGORY[b.key];
              const pct = Math.round((b.spent / b.limit) * 100);
              const over = pct >= 100;
              return (
                <div key={b.key} className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {cat.emoji} {cat.name}
                    </span>
                    <span className={`font-mono text-xs font-bold ${over ? 'text-expense' : 'text-dim'}`}>{pct}%</span>
                  </span>
                  <Progress pct={pct} color={over ? 'var(--color-expense)' : cat.accent} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget derecho: meta de ahorro y deuda */}
        <div className="absolute top-[250px] right-4 hidden lg:block">
          <div className={`${widgetBox} w-[300px]`}>
            <div className="flex flex-col gap-2">
              <span className="flex items-center justify-between">
                <span className="text-[15px] font-extrabold">
                  {GOAL.emoji} {GOAL.name}
                </span>
                <span className="font-mono text-xs font-bold text-income">{goalPct}%</span>
              </span>
              <Progress pct={goalPct} color="var(--color-income)" />
              <span className="text-xs text-dim">
                {cop(GOAL.saved)} / {cop(GOAL.target)}
              </span>
            </div>
            <div className="h-px bg-line" />
            <div className="flex flex-col gap-2">
              <span className="flex items-center justify-between">
                <span className="text-[15px] font-extrabold">
                  {DEBT.emoji} {DEBT.name}
                </span>
                <span className="font-mono text-xs font-bold text-dim">{debtPaid}%</span>
              </span>
              <Progress pct={debtPaid} color="var(--color-accent)" />
              <span className="text-xs text-dim">
                {cop(DEBT.remaining)} · día {DEBT.dueDay}
              </span>
            </div>
          </div>
          <HandNote className="mt-3 ml-16 w-[240px]">{t.hero.goalsNote}</HandNote>
        </div>

        <PhoneMock />

        <p className="mb-6 font-hand text-[22px] text-dim lg:absolute lg:mb-0 lg:bottom-[70px] lg:left-[60px] lg:w-[250px] lg:-rotate-3">{t.hero.phoneHint}</p>
      </div>
    </section>
  );
}
