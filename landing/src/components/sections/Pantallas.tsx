'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import type { Dictionary } from '@/i18n/config';
import { SectionHead } from './shared';

/** Capturas reales de la app, una por tarjeta (mismo orden que `t.items`).
 * `null` = todavía no hay captura: se muestra un marcador. Las capturas se
 * sacan del variant `test` con datos de ejemplo (nunca del teléfono con datos
 * reales) y se normalizan al mismo lienzo para que se vean del mismo tamaño.
 * Al reemplazar una, usar un nombre de archivo NUEVO: `next/image` cachea por URL. */
const SRC: (string | null)[] = [null, null, null, null];

/** Carrusel centrado (portado de Meld): la tarjeta activa queda en el medio y
 * las demás a los lados, más chicas y apagadas. Flechas, puntos, teclado
 * (← →) y deslizar mueven el mismo scroll con snap. */
export function Pantallas({ t }: { t: Dictionary['pantallas'] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = t.items.length;

  const cards = () => Array.from(scroller.current?.children ?? []) as HTMLElement[];

  const goTo = (i: number) => {
    const el = scroller.current;
    const card = cards()[Math.max(0, Math.min(count - 1, i))];
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    const all = cards();
    let nearest = 0;
    all.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      const best = Math.abs(all[nearest].offsetLeft + all[nearest].offsetWidth / 2 - center);
      if (d < best) nearest = i;
    });
    setActive(nearest);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  const navBtn =
    'flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-2 text-ink transition-colors hover:bg-line disabled:cursor-default disabled:bg-surface disabled:text-faint';

  return (
    <section id="pantallas" className="flex w-full scroll-mt-10 flex-col items-center gap-[26px] border-y border-line bg-sunken py-16 sm:gap-10 sm:py-28">
      <div className="px-5">
        <SectionHead title={t.title} subtitle={t.subtitle} />
      </div>
      <div
        ref={scroller}
        role="region"
        aria-roledescription="carousel"
        aria-label={t.title}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="relative flex w-full snap-x snap-mandatory gap-3.5 overflow-x-auto px-[calc(50%-125px)] outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-accent sm:gap-6 sm:px-[calc(50%-150px)] [&::-webkit-scrollbar]:hidden"
      >
        {t.items.map((item, i) => {
          const src = SRC[i];
          return (
            <div
              key={item.alt}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              onClick={() => i !== active && goTo(i)}
              className={`flex h-[470px] w-[250px] shrink-0 snap-center flex-col items-center overflow-hidden rounded-[22px] border border-line bg-card pt-[26px] transition-[scale,opacity] duration-300 ease-out sm:h-[560px] sm:w-[300px] sm:rounded-[26px] sm:pt-[34px] ${
                i === active ? 'scale-100 opacity-100' : 'scale-[0.9] cursor-pointer opacity-45'
              }`}
            >
              <p className="text-center text-[23px] leading-[1.15] font-extrabold tracking-tight sm:text-[28px]">
                {item.a}
                <br />
                <span className="text-mute">{item.b}</span>
              </p>
              {src ? (
                <Image src={src} alt={item.alt} width={330} height={495} className="mt-3 h-[405px] w-[270px] object-contain sm:mt-3.5 sm:h-[495px] sm:w-[330px]" />
              ) : (
                <div className="mt-5 flex w-[200px] flex-1 flex-col items-center justify-center gap-3 rounded-t-[30px] border-x border-t border-dashed border-line text-faint sm:w-[240px]">
                  <Smartphone size={28} aria-hidden />
                  <span className="font-mono text-xs">{t.soon}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3.5">
        <button type="button" aria-label={t.prev} onClick={() => goTo(active - 1)} disabled={active === 0} className={navBtn}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1.5">
          {t.items.map((item, i) => (
            <button
              key={item.alt}
              type="button"
              aria-label={`${t.goTo} ${i + 1}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(i)}
              className="flex h-6 cursor-pointer items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-sm transition-all ${i === active ? 'w-[18px] bg-ink' : 'w-1.5 bg-[#4a5058]'}`} />
            </button>
          ))}
        </div>
        <button type="button" aria-label={t.next} onClick={() => goTo(active + 1)} disabled={active === count - 1} className={navBtn}>
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
