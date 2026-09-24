import { ArrowDown, ArrowUp, BatteryFull, CalendarDays, ChartColumn, ChevronDown, Mic, Plus, Search, Signal, Wifi } from 'lucide-react';
import { CATEGORY, CHART, PHONE, RECENT, cop } from '@/content/app';
import { TxRow } from './TxRow';

/** Monto de balance como lo muestra la app (`RollingNumber` con prefijo "$", sin espacio). */
const bal = (n: number) => cop(n).replace('$ ', '$');

/** Marco de teléfono de 380×780 (se escala al 80% en móvil), igual al de la
 * portada de Meld. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[624px] w-[304px] sm:h-[780px] sm:w-[380px]">
      <div className="relative h-[780px] w-[380px] origin-top-left scale-[0.8] overflow-hidden rounded-[58px] border-8 border-[#2a2f36] bg-bg shadow-[0_40px_90px_rgba(0,0,0,0.7),inset_0_0_0_2px_#3a4048] sm:scale-100">
        <div className="pointer-events-none absolute top-3.5 left-1/2 z-40 size-[22px] -translate-x-1/2 rounded-full bg-black" />
        {children}
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-40 h-1 w-[114px] -translate-x-1/2 rounded-sm bg-[#5a6068]" />
      </div>
    </div>
  );
}

/** Pantalla de inicio de la app (`app/(tabs)/index.tsx`, tema oscuro), estática. */
export function PhoneMock() {
  const max = Math.max(...CHART.map((c) => c.amount));
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col px-4 pt-3" aria-hidden>
        {/* Barra de estado */}
        <div className="flex h-7 items-center justify-between px-3 text-[13px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5 text-ink">
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryFull size={16} />
          </span>
        </div>

        {/* Balance */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold tracking-[2px] text-dim uppercase">Balance neto</span>
          <span className="text-[50px] leading-[56px] font-extrabold tracking-[-2.5px]">{bal(PHONE.balance)}</span>
          <span className="-mt-1 text-xs font-semibold text-dim">Patrimonio neto: {bal(PHONE.netWorth)}</span>
          <span className="mt-1 flex gap-1.5 rounded-full bg-surface-2 p-[5px]">
            <span className="flex items-center gap-[5px] rounded-full bg-expense-bg px-3.5 py-[7px] text-[13px] font-bold text-expense-ink">
              <ArrowDown size={13} strokeWidth={2.8} />
              {bal(PHONE.expense)}
            </span>
            <span className="flex items-center gap-[5px] rounded-full bg-surface-2 px-3.5 py-[7px] text-[13px] font-semibold text-dim">
              <ArrowUp size={13} strokeWidth={2.8} />
              {bal(PHONE.income)}
            </span>
          </span>
          <span className="mt-1 flex w-[220px] flex-col items-center gap-1.5">
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${PHONE.budgetPct}%` }} />
            </span>
            <span className="text-[11px] font-semibold text-dim">
              {PHONE.budgetPct}% de {bal(PHONE.budget)}
            </span>
          </span>
        </div>

        {/* Período + gráfica de categorías */}
        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold">
            <CalendarDays size={13} className="text-dim" />
            Este mes
            <ChevronDown size={13} className="text-dim" />
          </span>
        </div>
        <div className="mt-3 flex h-[104px] items-end justify-between gap-2 px-1">
          {CHART.map((c) => {
            const cat = CATEGORY[c.key];
            return (
              <span key={c.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="w-full rounded-lg" style={{ height: `${(c.amount / max) * 76}px`, background: cat.accent }} />
                <span className="text-[15px] leading-none">{cat.emoji}</span>
              </span>
            );
          })}
        </div>

        {/* Lista */}
        <span className="mt-5 mb-2 text-[11px] font-bold tracking-[2px] text-dim uppercase">Reciente</span>
        <div className="flex flex-col gap-2">
          {RECENT.slice(0, 3).map((tx) => (
            <TxRow key={tx.title} tx={tx} compact />
          ))}
        </div>
      </div>

      {/* Dock flotante (`FloatingDock.tsx`): + · buscar · reportes, y el micrófono aparte */}
      <div className="absolute inset-x-0 bottom-7 z-30 flex items-center justify-center gap-3" aria-hidden>
        <div className="pointer-events-none absolute -top-16 inset-x-0 h-24 bg-gradient-to-t from-bg to-transparent" />
        <span className="relative flex h-14 items-center gap-5 rounded-full border border-line bg-card px-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <Plus size={22} strokeWidth={2.2} />
          <Search size={22} />
          <ChartColumn size={22} strokeWidth={1.8} />
        </span>
        <span className="relative flex size-14 items-center justify-center rounded-full bg-[#2D5BFF] shadow-[0_12px_30px_rgba(45,91,255,0.35)]">
          <Mic size={24} className="text-white" />
        </span>
      </div>
    </PhoneFrame>
  );
}
