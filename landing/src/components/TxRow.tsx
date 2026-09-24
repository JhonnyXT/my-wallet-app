import { cop, type Tx } from '@/content/app';

/** Réplica de una fila del historial de la app (`TransactionItem.tsx`, tema
 * oscuro): círculo con el emoji sobre el color de la categoría, "Categoría ·
 * fecha", título y el monto en una píldora (gasto con "- ", ingreso en verde
 * con "+ "). `compact` es la versión para el teléfono de la portada. */
export function TxRow({ tx, compact = false, className = '' }: { tx: Tx; compact?: boolean; className?: string }) {
  return (
    <div
      className={`flex w-full items-center rounded-2xl text-left border border-line bg-surface-2 ${
        compact ? 'gap-2.5 px-3 py-2.5' : 'gap-3.5 px-4 py-3.5'
      } ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full ${compact ? 'size-10 text-lg' : 'size-[52px] text-2xl'}`}
        style={{ background: tx.tint }}
        aria-hidden
      >
        {tx.emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className={`truncate font-medium text-dim ${compact ? 'text-[10.5px]' : 'text-xs'}`}>
          {tx.category}
          {'  ·  '}
          {tx.date}
        </span>
        <span className={`truncate font-bold tracking-[-0.2px] ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{tx.title}</span>
      </span>
      <span className={`shrink-0 rounded-full font-bold ${compact ? 'text-[11.5px]' : 'text-[13px]'} ${tx.income ? 'text-income' : 'text-ink'}`}>
        {tx.income ? '+ ' : '- '}
        {cop(tx.amount)}
      </span>
    </div>
  );
}
