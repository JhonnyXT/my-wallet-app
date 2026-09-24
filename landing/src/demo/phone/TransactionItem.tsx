'use client';

// Réplica de `src/components/ui/TransactionItem.tsx` (tema oscuro): deslizar a
// la izquierda revela eliminar (con confirmación). Editar (deslizar a la
// derecha) y el detalle (tap) quedan fuera de la demo.

import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { categoryColor, categoryName, type DemoTx } from '../data';
import { ConfirmDialog, cop, t } from './ui';

const DELETE_WIDTH = 72;
const SWIPE_THRESH = 48;
const CLOSE_THRESH = 20;
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const SPRING = 'transform 320ms cubic-bezier(.25,1.2,.4,1)';

export function TransactionItem({
  tx,
  index,
  onDelete,
  scale,
}: {
  tx: DemoTx;
  index: number;
  onDelete: (id: number) => void;
  /** Escala del teléfono en pantalla: el arrastre se mide en dp de la app. */
  scale: number;
}) {
  const palette = categoryColor(tx.emoji);
  const name = categoryName(tx.emoji);
  const isExpense = tx.amount >= 0;
  const title = tx.description.replace(/#\w+/g, '').trim() || name;

  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const open = useRef<'delete' | null>(null);
  const g = useRef<{ x0: number; y0: number; horizontal: boolean | null; dx: number } | null>(null);
  const suppressClick = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const base = () => (open.current === 'delete' ? -DELETE_WIDTH : 0);
  const settle = (to: 'delete' | null) => {
    open.current = to;
    setX(to === 'delete' ? -DELETE_WIDTH : 0);
  };

  // En táctil, un gesto horizontal no debe mover el scroll vertical de la lista.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (g.current?.horizontal) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  const release = () => {
    const s = g.current;
    g.current = null;
    setDragging(false);
    if (!s || !s.horizontal) return;
    suppressClick.current = true;
    const dx = s.dx;
    if (open.current) {
      if (dx > CLOSE_THRESH) settle(null);
      else settle(open.current);
    } else if (dx < -SWIPE_THRESH) settle('delete');
    else settle(null);
  };

  return (
    <div
      className="animate-row-in"
      style={{ marginBottom: 8, animationDelay: `${Math.min(index, 12) * 40}ms`, animationFillMode: 'both' }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: t.itemBg,
          borderRadius: 16,
          border: `1px solid ${t.border}`,
        }}
      >
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: x < 0 || leaving ? 1 : 0 }}>
          <button
            type="button"
            aria-label={`Eliminar ${title}`}
            tabIndex={x < 0 ? 0 : -1}
            onClick={() => setConfirm(true)}
            className="cursor-pointer active:opacity-80"
            style={{ width: 48, height: 48, borderRadius: 9999, background: '#EF4444', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
          </button>
        </div>

        <div
          ref={rowRef}
          style={{
            background: t.itemBg,
            borderRadius: 16,
            transform: `translateX(${leaving ? -400 : x}px)`,
            transition: dragging ? 'none' : leaving ? 'transform 220ms ease-in' : SPRING,
            touchAction: 'pan-y',
            position: 'relative',
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            g.current = { x0: e.clientX, y0: e.clientY, horizontal: null, dx: 0 };
          }}
          onPointerMove={(e) => {
            const s = g.current;
            if (!s) return;
            const dx = (e.clientX - s.x0) / scale;
            const dy = (e.clientY - s.y0) / scale;
            if (s.horizontal === null) {
              if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
                s.horizontal = true;
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              } else if (Math.abs(dy) > 8) {
                s.horizontal = false;
              }
            }
            if (s.horizontal) {
              s.dx = dx;
              setX(Math.max(-DELETE_WIDTH, Math.min(0, base() + dx)));
            }
          }}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <div
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              if (open.current) settle(null);
            }}
            className="cursor-grab select-none"
            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '14px 16px' }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 9999,
                background: palette.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
                flexShrink: 0,
                fontSize: 24,
                lineHeight: '32px',
              }}
              aria-hidden
            >
              {tx.emoji}
            </span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, marginRight: 12, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textSub, lineHeight: '16px', letterSpacing: 0.1, whiteSpace: 'pre' }}>
                {name}
                {'  ·  '}
                {formatDate(tx.date)}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: t.text,
                  lineHeight: '21px',
                  letterSpacing: -0.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {title}
              </span>
              {tx.tags.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: t.textSub, lineHeight: '16px', marginTop: 2, whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.tags.join('  ')}
                </span>
              )}
            </span>
            <span style={{ background: t.pillNeutral, borderRadius: 9999, padding: '7px 12px', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: '17px', color: isExpense ? t.text : '#059669', whiteSpace: 'nowrap' }}>
                {isExpense ? '- ' : '+ '}
                {cop(tx.amount)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        visible={confirm}
        title="¿Eliminar transacción?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          setConfirm(false);
          setLeaving(true);
          setTimeout(() => onDelete(tx.id), 220);
        }}
        onCancel={() => {
          setConfirm(false);
          settle(null);
        }}
      />
    </div>
  );
}
