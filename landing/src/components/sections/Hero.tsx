import type { Dictionary, Locale } from '@/i18n/config';
import { WaitlistForm } from '../WaitlistForm';

export function Hero({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section id="top" className="flex w-full scroll-mt-20 flex-col items-center px-5 pt-10 text-center sm:pt-16">
      <h1 className="relative isolate text-[44px] leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-[80px] sm:leading-[1.03]">
        {/* Brillo azul de la app detrás del título, como el de la landing de Meld. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-[-30%] left-1/2 -z-10 h-[190px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(19,91,236,0.45)_0%,rgba(19,91,236,0.12)_45%,rgba(19,91,236,0)_70%)] sm:h-[320px] sm:w-[620px]"
        />
        {t.hero.title1}
        <br />
        <span className="text-mute">{t.hero.title2}</span>
      </h1>
      <p className="mt-[18px] max-w-[620px] text-[17px] leading-relaxed text-dim sm:mt-6 sm:text-xl">{t.hero.subtitle}</p>
      <div id="avisame" className="mt-[26px] flex w-full scroll-mt-24 justify-center sm:mt-8">
        <WaitlistForm t={t.waitlist} locale={locale} />
      </div>
      <p className="mt-1 text-[13px] leading-normal text-faint sm:text-sm">
        {t.hero.finePrint}
        {' · '}
        <a href="#privacidad" className="text-dim underline hover:text-ink">
          {t.hero.privacyLink}
        </a>
      </p>
    </section>
  );
}
