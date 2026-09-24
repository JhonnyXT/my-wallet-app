'use client';

import { ArrowDown, ArrowUp, Mic } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/i18n/config';
import { CATEGORY, VOICE_EXAMPLES, cop, type VoiceResult } from '@/content/app';

const reducedMotionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribeReducedMotion = (onChange: () => void) => {
  const mq = reducedMotionQuery();
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

const WORD_MS = 230; // cada palabra "dictada"
const CHIP_MS = 260; // cada dato que "entiende" MyWallet
const HOLD_MS = 2600; // pausa con el resultado completo antes del siguiente ejemplo

type Chip = { key: string; node: React.ReactNode; tone?: 'expense' | 'income' };

function chipsFor(r: VoiceResult, t: Dictionary['voz']): Chip[] {
  const cat = CATEGORY[r.category];
  return [
    {
      key: 'type',
      tone: r.income ? 'income' : 'expense',
      node: (
        <>
          {r.income ? <ArrowUp size={13} strokeWidth={2.8} /> : <ArrowDown size={13} strokeWidth={2.8} />}
          {r.income ? t.income : t.expense}
        </>
      ),
    },
    { key: 'amount', node: <span className="font-mono">{cop(r.amount)}</span> },
    {
      key: 'cat',
      node: (
        <>
          {cat.emoji} {cat.name}
        </>
      ),
    },
    ...(r.today ? [{ key: 'date', node: <>{t.today}</> }] : []),
  ];
}

/** La tarjeta de "Dilo, y queda anotado" en movimiento: el micrófono late
 * mientras la frase aparece palabra por palabra (como el dictado real),
 * después se suman los datos que entendió el parser (uno o varios
 * movimientos) y pasa al siguiente ejemplo. Solo corre con la tarjeta en
 * pantalla; con "reducir movimiento" muestra el primer ejemplo completo. */
export function VoiceShowcase({ t }: { t: Dictionary['voz'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => reducedMotionQuery().matches, () => false);
  const [example, setExample] = useState(0);
  const [step, setStep] = useState(0); // palabras mostradas + datos mostrados

  const ex = VOICE_EXAMPLES[example];
  const words = ex.quote.split(' ');
  const groups = ex.results.map((r) => chipsFor(r, t));
  const chipCount = groups.reduce((n, g) => n + g.length, 0);
  const total = words.length + chipCount;

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reduced) return;
    const delay = step < words.length ? WORD_MS : step < total ? CHIP_MS : HOLD_MS;
    const id = setTimeout(() => {
      if (step < total) setStep(step + 1);
      else {
        setExample((e) => (e + 1) % VOICE_EXAMPLES.length);
        setStep(0);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [visible, reduced, step, total, words.length]);

  const shownWords = reduced ? words.length : Math.min(step, words.length);
  const revealed = reduced ? chipCount : Math.max(0, step - words.length);
  // Cuántos chips de cada movimiento se ven: se llenan en orden, uno tras otro.
  const shownPerGroup = groups.map((_, gi) => {
    const before = groups.slice(0, gi).reduce((n, g) => n + g.length, 0);
    return Math.max(0, Math.min(groups[gi].length, revealed - before));
  });
  const listening = !reduced && shownWords < words.length;
  const chipBase = 'flex animate-row-in items-center gap-1.5 rounded-full px-3 py-[7px] text-[13px] font-semibold sm:text-sm';
  const toneClass = { expense: 'bg-expense-bg text-expense-ink', income: 'bg-income-bg text-income-ink' } as const;

  return (
    <div ref={ref} className="flex w-full max-w-[460px] flex-col items-center gap-[18px] sm:gap-[26px]">
      <div className="relative flex size-[92px] items-center justify-center sm:size-[120px]">
        {listening && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-[#2D5BFF]/25 [animation-duration:1.6s]" />
            <span className="absolute -inset-3 animate-ping rounded-full bg-[#2D5BFF]/10 [animation-delay:0.4s] [animation-duration:1.6s]" />
          </>
        )}
        <div
          className={`relative flex size-full items-center justify-center rounded-full bg-[radial-gradient(circle,#5B82FF_0%,#2D5BFF_45%,rgba(45,91,255,0.15)_72%,rgba(45,91,255,0)_100%)] transition-transform duration-500 ${
            listening ? 'scale-105' : 'scale-100'
          }`}
        >
          <Mic className="size-[30px] text-white sm:size-10" aria-hidden />
        </div>
      </div>

      {/* Barras de sonido: se mueven mientras "escucha". */}
      <div className="flex h-6 items-center gap-1" aria-hidden>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-accent/80 transition-[height] duration-300"
            style={listening ? { height: '100%', animation: `voice-bar 0.9s ease-in-out ${i * 0.11}s infinite alternate` } : { height: 4 }}
          />
        ))}
      </div>

      <p className="sr-only">“{ex.quote}”</p>
      <p aria-hidden className="min-h-[54px] text-center text-[19px] leading-[1.4] font-semibold sm:min-h-[68px] sm:text-2xl">
        “{words.slice(0, shownWords).join(' ')}
        {listening && <span className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[3px] animate-pulse bg-accent" />}”
      </p>

      <div className="flex min-h-[132px] w-full flex-col gap-2.5 rounded-[18px] border border-line bg-bg p-3.5 sm:rounded-[20px] sm:p-[18px]">
        <span className="flex items-center justify-between font-mono text-[11px] tracking-[0.08em] text-faint uppercase sm:text-xs">
          {t.understood}
          {ex.results.length > 1 && revealed > 0 && (
            <span className="text-accent">
              {ex.results.length} {t.movements}
            </span>
          )}
        </span>
        {groups.map((chips, gi) => {
          const shown = shownPerGroup[gi];
          if (shown === 0) return null;
          return (
            <div key={`${example}-${gi}`} className="flex flex-wrap gap-[7px] sm:gap-2">
              {chips.slice(0, shown).map((c) => (
                <span key={c.key} className={`${chipBase} ${c.tone ? toneClass[c.tone] : 'bg-surface-2'}`}>
                  {c.node}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* Indicador del ejemplo actual */}
      <div className="flex gap-1.5" aria-hidden>
        {VOICE_EXAMPLES.map((e, i) => (
          <span key={e.quote} className={`h-1.5 rounded-sm transition-all duration-300 ${i === example ? 'w-[18px] bg-ink' : 'w-1.5 bg-[#4a5058]'}`} />
        ))}
      </div>
    </div>
  );
}
