'use client';

// Réplica de `app/(tabs)/index.tsx` + `FloatingDock.tsx` (tema oscuro).

import { ArrowDown, ArrowUp, Bell, Calendar, ChartColumn, ChevronsUpDown, Mic, Plus, Search, Settings, X } from 'lucide-react';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { TODAY, expenseCategories, incomeCategories } from '../data';
import { allTimeBalance, applyPeriod, isCurrentPeriod, periodLabel, type DemoApi } from '../useDemo';
import { CategoryChart } from './CategoryChart';
import { TransactionItem } from './TransactionItem';
import { NAV_H, Portal, PressableScale, Touchable, bal, col, row, t, usePhone } from './ui';

const DOCK_HEIGHT = 64;
const DOCK_BOTTOM_OFFSET = 24;

// ─── RollingNumber: contador tipo odómetro ──────────────────────────────────────

function RollingNumber({ value, style, lineHeight }: { value: number; style: CSSProperties; lineHeight: number }) {
  const chars = bal(value).split('');
  return (
    <span style={{ ...style, display: 'inline-flex', height: lineHeight, lineHeight: `${lineHeight}px`, overflow: 'hidden' }} aria-label={bal(value)}>
      {chars.map((ch, i) => {
        const key = chars.length - i; // posición desde la derecha: las columnas se conservan
        if (!/\d/.test(ch)) return <span key={`s${key}`}>{ch}</span>;
        const d = Number(ch);
        return (
          <span key={`d${key}`} style={{ display: 'inline-block', height: lineHeight, overflow: 'hidden' }} aria-hidden>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                transform: `translateY(${-d * lineHeight}px)`,
                transition: 'transform 400ms cubic-bezier(0.33,1,0.68,1)',
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span key={n} style={{ height: lineHeight }}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ─── Dock (`FloatingDock.tsx`) ─────────────────────────────────────────────────

function DockPill({ menuOpen, onPlus, onReports }: { menuOpen: boolean; onPlus: () => void; onReports: () => void }) {
  const btn: CSSProperties = { width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div
      style={{
        ...row,
        justifyContent: 'center',
        height: DOCK_HEIGHT,
        gap: 20,
        padding: '8px 24px',
        background: t.surface,
        borderRadius: 9999,
        boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
      }}
    >
      <Touchable onPress={onPlus} style={btn} label={menuOpen ? 'Cerrar menú' : 'Nuevo movimiento'} className="hover:bg-white/5">
        {menuOpen ? <X size={22} color={t.text} strokeWidth={2.2} /> : <Plus size={22} color={t.text} strokeWidth={2.2} />}
      </Touchable>
      {/* Buscar: fuera de la demo, solo se muestra. */}
      <span style={btn} aria-hidden>
        <Search size={22} color={t.text} strokeWidth={2} />
      </span>
      <Touchable onPress={onReports} style={btn} label="Reportes" className="hover:bg-white/5">
        <ChartColumn size={22} color={t.text} strokeWidth={1.8} />
      </Touchable>
    </div>
  );
}

function MicFab({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      label="Dictar"
      className="active:scale-[0.88]"
      style={{
        width: 64,
        height: 64,
        borderRadius: 9999,
        background: '#2D5BFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 12px 30px rgba(45,91,255,0.3)',
      }}
    >
      <Mic size={26} color="#FFFFFF" strokeWidth={2} />
    </PressableScale>
  );
}

function Dock({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const menuOpen = state.overlay?.kind === 'menu';
  const bottom = NAV_H + DOCK_BOTTOM_OFFSET;
  const container: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom, height: DOCK_HEIGHT, ...row, justifyContent: 'center', gap: 12 };
  const onReports = () => dispatch({ type: 'openReports' });
  const onMic = () => dispatch({ type: 'openVoice' });
  const option = (label: string, income: boolean) => (
    <Touchable
      onPress={() => dispatch({ type: 'newForm', isExpense: !income })}
      style={{ ...row, justifyContent: 'space-between', gap: 32, padding: '14px 0', width: '100%' }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{label}</span>
      <span style={{ width: 36, height: 36, borderRadius: 9999, background: income ? '#DCFCE7' : '#FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {income ? <ArrowUp size={18} color="#16A34A" strokeWidth={2.5} /> : <ArrowDown size={18} color="#DC2626" strokeWidth={2.5} />}
      </span>
    </Touchable>
  );
  return (
    <>
      <div style={{ ...container, zIndex: 30, pointerEvents: 'none' }}>
        <div style={{ ...row, gap: 12, pointerEvents: 'auto' }}>
          <DockPill menuOpen={menuOpen} onPlus={() => dispatch({ type: 'overlay', overlay: { kind: 'menu' } })} onReports={onReports} />
          <MicFab onPress={onMic} />
        </div>
      </div>
      {menuOpen && (
        <Portal>
          <div style={{ position: 'absolute', inset: 0, zIndex: 65, pointerEvents: 'auto', animation: 'fade-in 180ms both' }}>
            <div onClick={() => dispatch({ type: 'overlay', overlay: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: bottom + DOCK_HEIGHT + 12,
                minWidth: 220,
                background: t.surface,
                borderRadius: 20,
                padding: '6px 20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              {option('Ingreso', true)}
              <div style={{ height: 1, background: t.border, margin: '0 -20px' }} />
              {option('Gasto', false)}
            </div>
            <div style={{ ...container, zIndex: 10 }}>
              <DockPill menuOpen onPlus={() => dispatch({ type: 'overlay', overlay: null })} onReports={onReports} />
              <MicFab onPress={onMic} />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

// ─── Pantalla ──────────────────────────────────────────────────────────────────

const headerBtn: CSSProperties = { width: 40, height: 40, borderRadius: 9999, background: t.itemBg, display: 'flex', alignItems: 'center', justifyContent: 'center' };

export function Dashboard({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const { scale } = usePhone();
  const { txs, period, typeFilter, categoryFilter } = state;

  // ── Filtros (useTransactionFilters) ──
  const filtered = useMemo(() => applyPeriod(txs, period), [txs, period]);
  const typeFiltered = useMemo(
    () => (typeFilter === 'expense' ? filtered.filter((x) => x.amount > 0) : typeFilter === 'income' ? filtered.filter((x) => x.amount < 0) : filtered),
    [filtered, typeFilter],
  );
  const displayed = categoryFilter ? typeFiltered.filter((x) => x.emoji === categoryFilter.emoji) : typeFiltered;
  const current = isCurrentPeriod(period);
  const chipLabel = periodLabel(period);

  // ── Totales (useDashboardTotals) ──
  const expenseTotal = typeFiltered.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  const incomeTotal = typeFiltered.filter((x) => x.amount < 0).reduce((s, x) => s - x.amount, 0);
  const allTime = allTimeBalance(txs);
  const monthlyExpense = current
    ? txs.filter((x) => new Date(x.date) >= new Date(TODAY.getFullYear(), TODAY.getMonth(), 1) && x.amount > 0).reduce((s, x) => s + x.amount, 0)
    : 0;
  const budgetPct = state.monthlyBudget > 0 && current ? Math.min(Math.round((monthlyExpense / state.monthlyBudget) * 100), 100) : 0;
  const overBudget = state.monthlyBudget > 0 && current ? Math.max(monthlyExpense - state.monthlyBudget, 0) : 0;
  const stats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const x of filtered) {
      if (typeFilter === 'income' ? x.amount >= 0 : x.amount <= 0) continue;
      map[x.emoji] = (map[x.emoji] ?? 0) + Math.abs(x.amount);
    }
    return Object.entries(map)
      .map(([emoji, total]) => ({ emoji, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, typeFilter]);
  const allEmojis = useMemo(() => {
    const cats = (typeFilter === 'income' ? incomeCategories() : expenseCategories()).map((c) => c.emoji);
    const known = new Set(cats);
    return [...cats, ...new Set(txs.map((x) => x.emoji).filter((e) => !known.has(e) && e !== '💸'))];
  }, [txs, typeFilter]);
  const isNewPeriod = filtered.length === 0 && current;

  // ── Scroll: compresión de la gráfica y parallax del balance ──
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const raf = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setScrollY(listRef.current?.scrollTop ?? 0));
  };
  const parallax = Math.min(1, Math.max(0, scrollY / 100));

  // ── Pull-down sin spinner para quitar el filtro de categoría ──
  const pull = useRef<{ y: number } | null>(null);
  const wheelAcc = useRef({ v: 0, at: 0 });
  const pullStart = (y: number) => {
    pull.current = categoryFilter && (listRef.current?.scrollTop ?? 0) <= 4 ? { y } : null;
  };
  const pullEnd = (y: number) => {
    if (pull.current && (y - pull.current.y) / scale > 80) dispatch({ type: 'clearCategoryFilter' });
    pull.current = null;
  };

  const pill = (active: boolean, bg: string): CSSProperties => ({ ...row, gap: 5, borderRadius: 999, padding: '7px 14px', background: active ? bg : t.pillNeutral });

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 28 }}>
      {/* Header fijo */}
      <div style={{ position: 'relative', padding: '64px 28px 20px' }}>
        {/* Período, calendario y ajustes: fuera de la demo, solo se muestran. */}
        <div style={{ position: 'absolute', top: 14, left: 20, zIndex: 10 }} aria-hidden>
          <span style={{ ...row, gap: 5, background: t.itemBg, borderRadius: 9999, border: `1.5px solid ${t.border}`, padding: '8px 14px' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.text, lineHeight: '20px' }}>{chipLabel}</span>
            <ChevronsUpDown size={13} color={t.text} strokeWidth={2.2} />
          </span>
        </div>
        <div style={{ position: 'absolute', top: 14, right: 20, zIndex: 10, ...row, gap: 4 }}>
          {state.pending.length > 0 && (
            <Touchable onPress={() => dispatch({ type: 'openNotifReview' })} label="Transacciones detectadas" style={{ ...headerBtn, borderRadius: 12, background: t.surface, position: 'relative' }}>
              <Bell size={20} color={t.text} strokeWidth={1.8} />
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#DC2626',
                  border: '2px solid #fff',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#fff',
                  animation: 'popup-in 200ms both',
                }}
              >
                {state.pending.length > 9 ? '9+' : state.pending.length}
              </span>
            </Touchable>
          )}
          <span style={headerBtn} aria-hidden>
            <Calendar size={22} color={t.text} strokeWidth={1.6} />
          </span>
          <span style={headerBtn} aria-hidden>
            <Settings size={22} color={t.text} strokeWidth={1.6} />
          </span>
        </div>

        <div style={{ ...col, gap: 10, alignItems: 'center' }}>
          <div style={{ ...col, gap: 8, alignItems: 'center', transform: `translateY(${-5 * parallax}px) scale(${1 - 0.06 * parallax})` }}>
            {state.monthlyBudget > 0 && typeFilter === null && current && overBudget > 0 && (
              <span style={{ background: 'rgba(220,38,38,0.18)', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#DC2626', letterSpacing: 0.2 }}>
                {bal(overBudget)} sobre presupuesto
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}>BALANCE NETO</span>
            <RollingNumber
              value={Math.abs(allTime)}
              lineHeight={64}
              style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2.5, color: allTime < 0 ? '#DC2626' : t.text }}
            />
            <div style={{ ...row, gap: 6, background: t.itemBg, borderRadius: 999, padding: 5 }}>
              <Touchable onPress={() => dispatch({ type: 'toggleType', filter: 'expense' })} style={pill(typeFilter !== 'income', '#FEE2E2')} label="Filtrar gastos">
                <ArrowDown size={13} strokeWidth={2.8} color={typeFilter !== 'income' ? '#E53E3E' : t.textSub} />
                <RollingNumber
                  value={expenseTotal}
                  lineHeight={17}
                  style={{ fontSize: 13, letterSpacing: 0.1, fontWeight: typeFilter !== 'income' ? 700 : 600, color: typeFilter !== 'income' ? '#E53E3E' : t.textSub }}
                />
              </Touchable>
              <Touchable onPress={() => dispatch({ type: 'toggleType', filter: 'income' })} style={pill(typeFilter === 'income', '#DCFCE7')} label="Filtrar ingresos">
                <ArrowUp size={13} strokeWidth={2.8} color={typeFilter === 'income' ? '#16A34A' : t.textSub} />
                <RollingNumber
                  value={incomeTotal}
                  lineHeight={17}
                  style={{ fontSize: 13, letterSpacing: 0.1, fontWeight: typeFilter === 'income' ? 700 : 600, color: typeFilter === 'income' ? '#16A34A' : t.textSub }}
                />
              </Touchable>
            </div>
            {state.monthlyBudget > 0 && typeFilter === null && current && (
              <div style={{ ...col, gap: 5, alignSelf: 'stretch', marginTop: 4 }}>
                <div style={{ height: 4, background: t.border, borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: 4, borderRadius: 9999, background: '#2D5BFF', width: `${budgetPct}%`, transition: 'width 400ms ease-out' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: t.textSub, letterSpacing: 0.1, textAlign: 'center' }}>
                  {budgetPct}% de {bal(state.monthlyBudget)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista: gráfica + transacciones en un solo scroll */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: NAV_H + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 48 }}
        onTouchStart={(e) => pullStart(e.touches[0].clientY)}
        onTouchEnd={(e) => pullEnd(e.changedTouches[0].clientY)}
        onPointerDown={(e) => e.pointerType === 'mouse' && pullStart(e.clientY)}
        onPointerUp={(e) => e.pointerType === 'mouse' && pullEnd(e.clientY)}
        onWheel={(e) => {
          if (!categoryFilter || (listRef.current?.scrollTop ?? 0) > 0 || e.deltaY >= 0) return;
          const now = Date.now();
          const acc = now - wheelAcc.current.at > 400 ? 0 : wheelAcc.current.v;
          wheelAcc.current = { v: acc - e.deltaY, at: now };
          if (wheelAcc.current.v > 240) {
            wheelAcc.current = { v: 0, at: 0 };
            dispatch({ type: 'clearCategoryFilter' });
          }
        }}
      >
        {categoryFilter && (
          <div style={{ ...row, padding: '8px 28px 4px' }}>
            <span style={{ ...row, gap: 8, background: t.surface, borderRadius: 9999, padding: '6px 10px 6px 12px', border: `1px solid ${t.border}`, animation: 'fade-in 200ms both' }}>
              <span style={{ fontSize: 14, lineHeight: '18px' }}>{categoryFilter.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: 0.1 }}>{categoryFilter.name}</span>
            </span>
          </div>
        )}

        {!categoryFilter && (
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {isNewPeriod && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, ...col, alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: t.textSub }}>Nuevo mes, ¡comienza ahora!</span>
                <span style={{ fontSize: 13, color: t.textTertiary, marginTop: 6 }}>Registra tu primer movimiento con + o el micrófono</span>
              </div>
            )}
            <div style={{ opacity: isNewPeriod ? 0.18 : 1, paddingTop: 8, paddingBottom: 16 }}>
              <CategoryChart
                stats={stats}
                allEmojis={allEmojis}
                budgets={typeFilter === 'income' ? {} : state.budgets}
                isIncomeMode={typeFilter === 'income'}
                animKey={`${typeFilter ?? 'all'}-${chipLabel}`}
                scrollY={scrollY}
                onTap={(emoji) => dispatch({ type: 'categoryFilter', emoji })}
              />
            </div>
          </div>
        )}

        {displayed.length > 0 && (
          <div style={{ ...row, justifyContent: 'space-between', padding: '4px 28px 10px' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: t.text, letterSpacing: 2.4, lineHeight: '18px' }}>
              {categoryFilter ? categoryFilter.name.toUpperCase() : typeFilter === 'expense' ? 'GASTOS' : typeFilter === 'income' ? 'INGRESOS' : 'RECIENTE'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 900, color: t.text, letterSpacing: 1 }}>
              {categoryFilter ? `${displayed.length} ${displayed.length === 1 ? 'registro' : 'registros'}` : chipLabel.toUpperCase()}
            </span>
          </div>
        )}

        {displayed.length === 0 ? (
          <div style={{ ...col, alignItems: 'center', padding: '64px 28px', textAlign: 'center' }}>
            <span style={{ fontSize: 48, marginBottom: 14 }}>{isNewPeriod ? '' : '💸'}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: t.textSub, marginBottom: 8 }}>{isNewPeriod ? '' : 'Sin movimientos aún'}</span>
            <span style={{ fontSize: 14, color: t.textSub, lineHeight: '21px' }}>{isNewPeriod ? '' : 'Toca + o el micrófono para registrar tu primer gasto o ingreso.'}</span>
          </div>
        ) : (
          displayed.map((tx, i) => (
            <div key={tx.id} style={{ padding: '0 28px' }}>
              <TransactionItem tx={tx} index={i} scale={scale} onDelete={(id) => dispatch({ type: 'delete', id })} />
            </div>
          ))
        )}
      </div>

      <Dock api={api} />
    </div>
  );
}
