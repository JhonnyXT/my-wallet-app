import type { ReactNode } from 'react';

/** Ícono o texto encajado dentro de un título ("Tu banco avisa, [MyWallet] anota"). */
export function InlineChip({ children }: { children: ReactNode }) {
  return (
    <span className="mx-1 inline-flex h-[38px] items-center rounded-[10px] border border-line bg-surface-2 px-2.5 align-middle sm:mx-1.5 sm:h-14 sm:rounded-[14px] sm:px-3.5">
      {children}
    </span>
  );
}

export function SectionHead({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:gap-3.5">
      <h2 className="text-[31px] leading-[1.25] font-extrabold tracking-[-0.03em] sm:text-[46px] sm:leading-[1.2]">{title}</h2>
      <p className="max-w-[540px] text-base leading-relaxed text-dim sm:text-lg">{subtitle}</p>
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-[calc(100%-40px)] max-w-[760px] bg-line" />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-accent uppercase">{children}</span>;
}

/** Nota "escrita a mano" con flecha curva, como las de Meld. `flip` voltea la flecha. */
export function HandNote({ children, className = '', flip = false }: { children: ReactNode; className?: string; flip?: boolean }) {
  return (
    <span className={`flex flex-col gap-1 ${className}`}>
      <span className="-rotate-3 font-hand text-[22px] leading-[1.15] text-dim">{children}</span>
      <svg
        width="70"
        height="36"
        viewBox="0 0 70 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={`text-faint ${flip ? '-scale-x-100 self-end' : ''}`}
        aria-hidden
      >
        <path d="M64 4 C 50 26, 30 30, 6 28" />
        <polyline points="14 22 6 28 14 33" />
      </svg>
    </span>
  );
}

/** Barra de progreso de la app (presupuesto, meta, deuda). */
export function Progress({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </span>
  );
}
