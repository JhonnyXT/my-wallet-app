'use client';

// Réplicas de `app/voice-batch-review.tsx` (varios movimientos dictados de una
// vez) y `app/notification-review.tsx` (avisos del banco pendientes). Editar un
// ítem (lápiz) se muestra pero queda fuera de la demo.

import { Check, ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { categoryColor, categoryName } from '../data';
import type { DemoApi, ReviewItem } from '../useDemo';
import { BLUE, ConfirmDialog, NAV_H, PressableScale, Touchable, absFill, col, row, t, usePhone } from './ui';

const money = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ─── Revisión por voz ──────────────────────────────────────────────────────────

function BatchCard({ item, onDelete }: { item: ReviewItem; onDelete: () => void }) {
  const { scale } = usePhone();
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef<{ x0: number; base: number; on: boolean } | null>(null);
  const release = () => {
    const s = g.current;
    g.current = null;
    setDragging(false);
    if (!s?.on) return;
    setX((cur) => (cur < -36 ? -72 : 0));
  };
  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', animation: 'row-in 300ms ease-out both' }}>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Eliminar ${item.description}`}
        tabIndex={x < 0 ? 0 : -1}
        className="cursor-pointer"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 72, background: '#EF4444', border: 0, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: x < 0 ? 1 : 0 }}
      >
        <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
      </button>
      <div
        className="cursor-grab select-none"
        onPointerDown={(e) => {
          if (e.button === 0) g.current = { x0: e.clientX, base: x, on: false };
        }}
        onPointerMove={(e) => {
          const s = g.current;
          if (!s) return;
          const dx = (e.clientX - s.x0) / scale;
          if (!s.on && Math.abs(dx) > 8) {
            s.on = true;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (s.on) setX(Math.max(-72, Math.min(0, s.base + dx)));
        }}
        onPointerUp={release}
        onPointerCancel={release}
        style={{
          ...row,
          gap: 12,
          padding: 14,
          borderRadius: 14,
          background: t.surface,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 300ms cubic-bezier(.25,1.2,.4,1)',
          touchAction: 'pan-y',
          position: 'relative',
        }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 12, background: categoryColor(item.emoji).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {item.emoji}
        </span>
        <span style={{ ...col, flex: 1, gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span>
          <span style={{ ...row, gap: 8 }}>
            <span style={{ fontSize: 12, color: t.textSub }}>{categoryName(item.emoji)}</span>
            <span style={{ padding: '2px 7px', borderRadius: 20, background: item.isExpense ? '#FEE2E2' : '#DCFCE7', fontSize: 11, fontWeight: 700, color: item.isExpense ? '#DC2626' : '#16A34A' }}>
              {item.isExpense ? '↓ Gasto' : '↑ Ingreso'}
            </span>
          </span>
        </span>
        <span style={{ ...col, alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: t.text, whiteSpace: 'nowrap' }}>$ {money(item.amount)}</span>
          <span style={{ padding: 4 }} aria-hidden>
            <Pencil size={15} color={t.textSub} strokeWidth={1.8} />
          </span>
        </span>
      </div>
    </div>
  );
}

export function BatchReview({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const items = state.batch;
  const totalExpense = items.filter((i) => i.isExpense).reduce((s, i) => s + i.amount, 0);
  return (
    <div style={{ ...absFill, background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 28 + 8 }}>
      <div style={{ ...row, gap: 8, padding: '14px 16px' }}>
        <PressableScale onPress={() => dispatch({ type: 'back' })} label="Volver" style={{ padding: 4 }}>
          <ChevronLeft size={26} color={t.text} strokeWidth={2} />
        </PressableScale>
        <span style={{ ...col, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: t.text }}>Revisar registros</span>
          <span style={{ fontSize: 13, marginTop: 2, color: t.textSub }}>
            {items.length} {items.length === 1 ? 'transacción detectada' : 'transacciones detectadas'}
          </span>
        </span>
      </div>

      <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ ...col, flex: 1, overflowY: 'auto', gap: 10, padding: '0 16px 12px' }}>
        {items.map((item) => (
          <BatchCard key={item.id} item={item} onDelete={() => dispatch({ type: 'removeBatch', id: item.id })} />
        ))}
        {items.length === 0 ? (
          <span style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, lineHeight: '22px', color: t.textSub, whiteSpace: 'pre-line' }}>
            {'Eliminaste todos los registros.\nUsa "+ Añadir registro manual" o vuelve atrás.'}
          </span>
        ) : (
          <span aria-hidden style={{ ...row, justifyContent: 'center', gap: 6, padding: '18px 0' }}>
            <Plus size={15} color={BLUE} strokeWidth={2.5} />
            <span style={{ fontSize: 14, fontWeight: 600, color: BLUE }}>Añadir registro manual</span>
          </span>
        )}
      </div>

      <div style={{ ...col, gap: 12, background: t.surface, borderTop: `1px solid ${t.border}`, padding: `14px 16px ${NAV_H + 12}px` }}>
        <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5, color: t.textSub, whiteSpace: 'pre' }}>
          {items.length} {items.length === 1 ? 'registro' : 'registros'}
          {items.some((i) => i.isExpense) ? `  ·  Total gastos $ ${money(totalExpense)}` : ''}
        </span>
        <PressableScale
          onPress={() => dispatch({ type: 'saveBatch' })}
          disabled={items.length === 0}
          style={{ ...row, justifyContent: 'center', gap: 8, height: 54, borderRadius: 16, width: '100%', background: items.length === 0 ? t.border : BLUE }}
        >
          <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
          <span style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>Guardar todo</span>
        </PressableScale>
      </div>
    </div>
  );
}

// ─── Avisos del banco pendientes ───────────────────────────────────────────────

export function NotificationReview({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const items = state.pending;
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <div style={{ ...absFill, background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 28 }}>
      <div style={{ ...row, gap: 8, padding: '8px 16px 16px' }}>
        <PressableScale onPress={() => dispatch({ type: 'back' })} label="Volver">
          <ChevronLeft size={26} color={BLUE} />
        </PressableScale>
        <span style={{ ...col, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Revisar registros</span>
          <span style={{ fontSize: 13, marginTop: 2, color: t.textSub }}>
            {items.length} transacci{items.length !== 1 ? 'ones' : 'ón'} detectada{items.length !== 1 ? 's' : ''}
          </span>
        </span>
        <PressableScale onPress={() => dispatch({ type: 'overlay', overlay: { kind: 'confirmDiscard' } })} label="Descartar todo">
          <Trash2 size={20} color={t.textSub} />
        </PressableScale>
      </div>

      <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ ...col, flex: 1, overflowY: 'auto', gap: 10, padding: '12px 16px 200px' }}>
        {items.map((item) => (
          <div key={item.id} style={{ ...row, gap: 2, padding: '14px 10px 14px 14px', borderRadius: 16, background: t.surface, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', animation: 'row-in 300ms ease-out both' }}>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: '#F3F0E7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, fontSize: 22, flexShrink: 0 }}>
              {item.emoji}
            </span>
            <span style={{ ...col, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span>
              <span style={{ ...row, gap: 8 }}>
                <span style={{ fontSize: 12, color: t.textSub }}>{categoryName(item.emoji)}</span>
                <span style={{ ...row, gap: 2, padding: '2px 6px', borderRadius: 6, background: item.isExpense ? '#FEE2E2' : '#D1FAE5', color: item.isExpense ? '#DC2626' : '#059669' }}>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{item.isExpense ? '↓' : '↑'}</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{item.isExpense ? 'Gasto' : 'Ingreso'}</span>
                </span>
              </span>
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, marginRight: 8, color: t.text, whiteSpace: 'nowrap' }}>$ {money(item.amount)}</span>
            <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={14} color={t.textSub} />
            </span>
            <Touchable
              onPress={() => dispatch({ type: 'removePending', id: item.id })}
              label="Eliminar transacción"
              style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={14} color="#EF4444" />
            </Touchable>
          </div>
        ))}
        <span aria-hidden style={{ ...col, alignItems: 'center', marginTop: 24 }}>
          <span style={{ fontSize: 14, marginBottom: 8, color: t.textSub }}>¿Falta algo?</span>
          <span style={{ ...row, gap: 4 }}>
            <Plus size={16} color={BLUE} />
            <span style={{ fontSize: 14, fontWeight: 600, color: BLUE }}>Añadir registro manual</span>
          </span>
        </span>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, ...col, alignItems: 'center', background: t.bg, padding: `16px 20px ${NAV_H + 12}px` }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.8, marginBottom: 12, color: t.textSub }}>
          {items.length} REGISTRO{items.length !== 1 ? 'S' : ''} · TOTAL $ {money(total)}
        </span>
        <PressableScale onPress={() => dispatch({ type: 'savePending' })} style={{ ...row, justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 28, width: '100%', background: BLUE }}>
          <Check size={18} color="#fff" strokeWidth={3} />
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Guardar todo</span>
        </PressableScale>
      </div>

      <ConfirmDialog
        visible={state.overlay?.kind === 'confirmDiscard'}
        title="¿Descartar todo?"
        message="Se eliminarán todas las transacciones detectadas de esta cola. Esta acción no se puede deshacer."
        confirmLabel="Descartar todo"
        onConfirm={() => dispatch({ type: 'discardPending' })}
        onCancel={() => dispatch({ type: 'overlay', overlay: null })}
      />
    </div>
  );
}
