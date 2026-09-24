'use client';

// Réplica de `src/components/ui/CategoryChart.tsx`: columnas proporcionales con
// el presupuesto como borde punteado, compresión al hacer scroll y tap corto
// para filtrar. (El popup de mantener presionado queda fuera de la demo.)

import { useRef } from 'react';
import { categoryColor } from '../data';
import { HScroll } from './ui';

export type CategoryStat = { emoji: string; total: number };

const BAR_W = 68;
const BAR_GAP = 14;
const H_PAD = 20;
const MAX_BAR_H = 280;
const MIN_GHOST_H = 44;
const RADIUS = 14;
export const CHART_H = MAX_BAR_H + 24;
const MIN_FILL_H = 52;
const PCT_MIN_RATIO = 0.4;
export const COMPRESS_END = 140;
const BORDER_DARK = 'rgba(255,255,255,0.45)';
const NEUTRAL_FILL = 'rgba(255,255,255,0.10)';
const LABEL = '#F1F5F9';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const interp = (v: number, a: number, b: number, from: number, to: number) => from + (to - from) * clamp01((v - a) / (b - a));

function fmtAmount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}k`;
  }
  return `${Math.round(n)}`;
}

/** Gestos de una columna: en la demo solo el tap corto (filtra por categoría). */
function useColumnGesture({ onTap }: { onTap: () => void }) {
  const origin = useRef({ x: 0, y: 0 });
  return {
    tap: onTap,
    onPointerDown: (e: React.PointerEvent) => {
      origin.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (Math.abs(e.clientX - origin.current.x) < 10 && Math.abs(e.clientY - origin.current.y) < 10) onTap();
    },
  };
}

function Column({
  stat,
  fillH,
  ghostH,
  pct,
  hasBudget,
  fillColor,
  fillOpacity,
  hasBorder,
  delay,
  animKey,
  scrollY,
  gesture,
  label,
}: {
  stat: CategoryStat;
  fillH: number;
  ghostH: number;
  pct: number;
  hasBudget: boolean;
  fillColor: string;
  fillOpacity: number;
  hasBorder: boolean;
  delay: number;
  animKey: string;
  scrollY: number;
  gesture: ReturnType<typeof useColumnGesture>;
  label: string;
}) {
  const minH = Math.min(fillH, MIN_FILL_H);
  const scrolledH = fillH - (fillH - minH) * clamp01(scrollY / COMPRESS_END);
  const isShortBar = fillH <= MIN_FILL_H;
  const verticalOpacity = isShortBar ? 0 : interp(scrollY, COMPRESS_END * 0.75, COMPRESS_END, 1, 0);
  const horizontalOpacity = isShortBar ? 1 : interp(scrollY, COMPRESS_END * 0.75, COMPRESS_END, 0, 1);
  const ghostOpacity = interp(scrollY, COMPRESS_END * 0.85, COMPRESS_END, 1, 0);

  return (
    <div style={{ position: 'relative', width: BAR_W, height: MAX_BAR_H, flexShrink: 0 }}>
      {/* Fill: la entrada escala desde abajo; el scroll lo comprime hacia MIN_FILL_H. */}
      <div
        key={`${animKey}-${fillH}`}
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: 'bottom',
          animation: `bar-grow 520ms cubic-bezier(0.33,1,0.68,1) ${delay}ms both`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: MAX_BAR_H,
            borderRadius: RADIUS,
            background: fillColor,
            opacity: fillOpacity,
            transformOrigin: 'bottom',
            transform: `scaleY(${scrolledH / MAX_BAR_H})`,
          }}
        />
      </div>
      {hasBorder && ghostH > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: ghostH,
            borderRadius: RADIUS,
            border: `1.5px dashed ${BORDER_DARK}`,
            opacity: ghostOpacity,
            transition: 'height 300ms ease-in-out',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 8,
          opacity: verticalOpacity,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: '22px' }}>{stat.emoji}</span>
        <span style={{ fontSize: 10, fontWeight: 800, lineHeight: '13px', color: LABEL }}>{fmtAmount(stat.total)}</span>
        {hasBudget && pct >= PCT_MIN_RATIO * 100 && (
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: '13px', color: LABEL, opacity: 0.75 }}>{pct}%</span>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: MIN_FILL_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          opacity: horizontalOpacity,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 15, lineHeight: '18px' }}>{stat.emoji}</span>
        <span style={{ fontSize: 9, fontWeight: 800, lineHeight: '12px', color: LABEL, textAlign: 'right' }}>{fmtAmount(stat.total)}</span>
      </div>
      <GestureLayer gesture={gesture} label={label} />
    </div>
  );
}

function GestureLayer({ gesture, label }: { gesture: ReturnType<typeof useColumnGesture>; label: string }) {
  const { tap, ...handlers } = gesture;
  return (
      <div
        {...handlers}
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tap();
          }
        }}
        style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer', touchAction: 'pan-x pan-y', WebkitTouchCallout: 'none', userSelect: 'none' }}
      />
  );
}

function GhostColumn({ emoji, gesture, label }: { emoji: string; gesture: ReturnType<typeof useColumnGesture>; label: string }) {
  return (
    <div style={{ position: 'relative', width: BAR_W, height: MAX_BAR_H, flexShrink: 0 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 8 }}>
        <span style={{ fontSize: 18, lineHeight: '22px', opacity: 0.25 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 600, lineHeight: '14px', color: 'rgba(255,255,255,0.22)' }}>—</span>
      </div>
      <GestureLayer gesture={gesture} label={label} />
    </div>
  );
}

function ChartColumn(props: {
  emoji: string;
  stat?: CategoryStat;
  budgets: Record<string, number>;
  isIncomeMode: boolean;
  scale: number;
  maxIncomeStat: number;
  delay: number;
  animKey: string;
  scrollY: number;
  onTap: (emoji: string) => void;
}) {
  const { emoji, stat, budgets, isIncomeMode, scale, maxIncomeStat } = props;
  const budgetAmt = isIncomeMode ? undefined : budgets[emoji];
  const gesture = useColumnGesture({ onTap: () => props.onTap(emoji) });

  const name = `Filtrar por ${emoji}`;
  if (!stat) return <GhostColumn emoji={emoji} gesture={gesture} label={name} />;

  let fillH: number;
  let ghostH: number;
  let displayPct: number;
  let ratio = 0;
  if (isIncomeMode) {
    ratio = maxIncomeStat > 0 ? stat.total / maxIncomeStat : 0;
    fillH = Math.round(ratio * MAX_BAR_H);
    ghostH = 0;
    displayPct = Math.round(ratio * 100);
  } else if (budgetAmt && budgetAmt > 0) {
    ratio = stat.total / budgetAmt;
    fillH =
      stat.total > 0
        ? Math.max(Math.min(Math.round(stat.total * scale), MAX_BAR_H), MIN_FILL_H)
        : Math.min(Math.round(stat.total * scale), MAX_BAR_H);
    ghostH = Math.max(Math.min(Math.round(budgetAmt * scale), MAX_BAR_H), MIN_GHOST_H);
    if (ratio < 1.0) ghostH = Math.max(ghostH, fillH);
    if (ratio >= 1.0) ghostH = Math.max(Math.round(fillH / ratio), MIN_GHOST_H);
    displayPct = Math.round(ratio * 100);
  } else {
    fillH = stat.total > 0 ? Math.max(Math.min(Math.round(stat.total * scale), MAX_BAR_H), MIN_FILL_H) : 0;
    ghostH = 0;
    displayPct = 0;
  }

  let fillColor: string;
  let hasBorder: boolean;
  if (isIncomeMode) {
    fillColor = '#22C55E';
    hasBorder = false;
  } else if (budgetAmt && budgetAmt > 0) {
    fillColor = ratio >= 1.0 ? '#EF4444' : categoryColor(emoji).accent;
    hasBorder = true;
  } else {
    fillColor = NEUTRAL_FILL;
    hasBorder = false;
  }
  const isNeutral = !isIncomeMode && !(budgetAmt && budgetAmt > 0);

  return (
    <Column
      stat={stat}
      fillH={fillH}
      ghostH={ghostH}
      pct={displayPct}
      hasBudget={isIncomeMode || !!(budgetAmt && budgetAmt > 0)}
      fillColor={fillColor}
      fillOpacity={isNeutral ? 1 : 0.68}
      hasBorder={hasBorder}
      delay={props.delay}
      animKey={props.animKey}
      scrollY={props.scrollY}
      gesture={gesture}
      label={name}
    />
  );
}

export function CategoryChart({
  stats,
  allEmojis,
  budgets,
  isIncomeMode,
  animKey,
  scrollY,
  onTap,
}: {
  stats: CategoryStat[];
  allEmojis: string[];
  budgets: Record<string, number>;
  isIncomeMode: boolean;
  animKey: string;
  scrollY: number;
  onTap: (emoji: string) => void;
}) {
  const maxIncomeStat = isIncomeMode && stats.length > 0 ? Math.max(...stats.map((s) => s.total)) : 1;
  const maxSpent = stats.length > 0 ? Math.max(...stats.map((s) => s.total)) : 0;
  const maxBudgetValue = Math.max(...Object.values(budgets).filter((v) => v > 0), 0);
  const maxBudget = isIncomeMode ? maxIncomeStat : Math.max(maxBudgetValue, maxSpent, 1);
  const scale = MAX_BAR_H / maxBudget;

  const withData = new Set(stats.map((s) => s.emoji));
  const ordered = isIncomeMode
    ? [...stats.map((s) => s.emoji), ...allEmojis.filter((e) => !withData.has(e))]
    : [
        ...stats.filter((s) => (budgets[s.emoji] ?? 0) > 0).map((s) => s.emoji),
        ...stats.filter((s) => (budgets[s.emoji] ?? 0) <= 0).map((s) => s.emoji),
        ...allEmojis.filter((e) => !withData.has(e)),
      ];

  let delay = 0;
  return (
    <div style={{ height: CHART_H, position: 'relative' }}>
      <HScroll style={{ height: CHART_H }}>
        <div
          style={{
            height: CHART_H,
            display: 'flex',
            alignItems: 'flex-end',
            padding: `0 ${H_PAD}px 12px`,
            gap: BAR_GAP,
            width: 'max-content',
          }}
        >
          {ordered.map((emoji) => {
            const stat = stats.find((s) => s.emoji === emoji);
            const d = delay;
            if (stat) delay += 80;
            return (
              <ChartColumn
                key={emoji}
                emoji={emoji}
                stat={stat}
                budgets={budgets}
                isIncomeMode={isIncomeMode}
                scale={scale}
                maxIncomeStat={maxIncomeStat}
                delay={d}
                animKey={animKey}
                scrollY={scrollY}
                onTap={onTap}
              />
            );
          })}
        </div>
      </HScroll>
    </div>
  );
}

