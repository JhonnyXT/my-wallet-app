'use client';

// Réplica de `app/reports.tsx` ("Promedios"), con los tokens oscuros de
// `src/theme/tokens.ts`. El selector de rango de "Tendencia" se muestra pero
// queda fuera de la demo (siempre los últimos 6 meses, el rango por defecto).

import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { categoryColor, categoryName } from '../data';
import { categoryAverages, monthlyTotals, type DemoApi } from '../useDemo';
import { PressableScale, absFill, col, cop, row, tk } from './ui';

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const RING = 116;
const STROKE = 10;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const SEGMENT = { expense: { bg: '#FEE2E2', text: '#E53E3E' }, income: { bg: '#DCFCE7', text: '#16A34A' } } as const;

const headline: CSSProperties = { fontSize: 17, fontWeight: 600, letterSpacing: -0.2, lineHeight: '22px', color: tk.text.primary };
const footnote: CSSProperties = { fontSize: 13, letterSpacing: 0.1, lineHeight: '18px', color: tk.text.secondary };
const body: CSSProperties = { fontSize: 17, lineHeight: '24px', color: tk.text.primary };
const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: tk.surface.secondary, borderRadius: 16, padding: 16, overflow: 'hidden', ...style }}>{children}</div>;
}

/** `Enter`: entrada escalonada de cada bloque. */
function Enter({ index, children }: { index: number; children: ReactNode }) {
  return <div style={{ animation: `row-in 400ms cubic-bezier(0.33,1,0.68,1) ${index * 60}ms both` }}>{children}</div>;
}

function Bar({ pct, h }: { pct: number; h: number }) {
  return (
    <div style={{ height: h, borderRadius: 999, background: tk.surface.elevated, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: tk.accent, transition: 'width 500ms ease-out' }} />
    </div>
  );
}

export function Reports({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const { months, items } = categoryAverages(state.txs, type);
  const trend = monthlyTotals(state.txs, type);
  const top = items[0];
  const secondary = items.slice(1, 3);
  const totalAvg = items.reduce((s, i) => s + i.avgMonthly, 0);
  const share = totalAvg > 0 && top ? top.avgMonthly / totalAvg : 0;
  const maxAvg = top?.avgMonthly ?? 0;
  const maxTrend = Math.max(...trend.map((x) => x.total), 1);
  const first = trend[0];
  const last = trend[trend.length - 1];
  const rangeLabel = `${MONTH_ABBR[first.month - 1]} ${first.year} – ${MONTH_ABBR[last.month - 1]} ${last.year}`;
  const pctOf = (v: number) => (maxAvg > 0 ? Math.max(Math.round((v / maxAvg) * 100), 4) : 0);

  const segment = (label: string, kind: 'expense' | 'income') => {
    const on = type === kind;
    return (
      <PressableScale onPress={() => setType(kind)} style={{ flex: 1, padding: '8px 0', borderRadius: 999, background: on ? SEGMENT[kind].bg : 'transparent', transition: 'background 200ms, transform 140ms' }}>
        <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 700, color: on ? SEGMENT[kind].text : tk.text.secondary }}>{label}</span>
      </PressableScale>
    );
  };

  const heroRow = (icon: string, label: string, value: string) => (
    <div style={{ ...row, gap: 8 }}>
      <span style={{ width: 30, height: 30, borderRadius: 999, background: tk.surface.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</span>
      <span style={{ ...col, minWidth: 0, flex: 1 }}>
        <span style={{ ...footnote, ...ellipsis }}>{label}</span>
        <span style={{ ...body, fontWeight: 600, fontSize: 14, ...ellipsis }}>{value}</span>
      </span>
    </div>
  );

  return (
    <div style={{ ...absFill, background: tk.surface.primary, display: 'flex', flexDirection: 'column', paddingTop: 28 }}>
      <div style={{ ...row, gap: 8, padding: 8 }}>
        <PressableScale onPress={() => dispatch({ type: 'back' })} label="Volver" style={{ padding: 8, borderRadius: 999, display: 'flex' }}>
          <ArrowLeft size={22} color={tk.text.primary} strokeWidth={2} />
        </PressableScale>
        <span style={{ ...headline, flex: 1, fontSize: 20, lineHeight: '25px' }}>Promedios</span>
      </div>

      <div key={type} className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ ...col, flex: 1, overflowY: 'auto', padding: '16px 16px 60px', gap: 24 }}>
        <Enter index={0}>
          <div style={{ ...row, padding: 4, gap: 4, background: tk.surface.secondary, borderRadius: 999, border: `1.5px solid ${tk.border}` }}>
            {segment('Gastos', 'expense')}
            {segment('Ingresos', 'income')}
          </div>
        </Enter>

        {top && (
          <>
            <Enter index={1}>
              <Card style={{ borderRadius: 24 }}>
                <div style={{ ...row, gap: 16 }}>
                  <div style={{ ...col, flex: 1, gap: 16, minWidth: 0 }}>
                    <div>
                      <div style={headline}>Promedio mensual</div>
                      <div style={{ ...footnote, marginTop: 2 }}>{type === 'expense' ? 'Gastos generales' : 'Ingresos generales'}</div>
                    </div>
                    {heroRow(top.emoji, 'Categoría top', categoryName(top.emoji))}
                    {heroRow('📅', 'Analizados', `${months} ${months === 1 ? 'mes' : 'meses'}`)}
                  </div>
                  <div style={{ position: 'relative', width: RING, height: RING, flexShrink: 0 }}>
                    <svg width={RING} height={RING} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={RING / 2} cy={RING / 2} r={R} stroke={tk.surface.elevated} strokeWidth={STROKE} fill="none" />
                      <circle
                        cx={RING / 2}
                        cy={RING / 2}
                        r={R}
                        stroke={tk.accent}
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${CIRC} ${CIRC}`}
                        strokeDashoffset={CIRC * (1 - share)}
                        fill="none"
                        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
                      />
                    </svg>
                    <div style={{ ...absFill, ...col, alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: tk.text.primary, ...ellipsis, maxWidth: RING - 2 * STROKE - 6 }}>{cop(totalAvg)}</span>
                      <span style={{ ...footnote, fontSize: 10 }}>/mes</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Enter>

            {secondary.length > 0 && (
              <Enter index={2}>
                <div style={{ ...row, gap: 8, alignItems: 'stretch' }}>
                  {secondary.map((item) => (
                    <Card key={item.emoji} style={{ flex: 1, minWidth: 0, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ ...body, fontWeight: 600, fontSize: 14, ...ellipsis }}>{categoryName(item.emoji)}</span>
                      <span style={{ ...row, gap: 4 }}>
                        <span style={{ fontSize: 16 }}>{item.emoji}</span>
                        <span style={{ ...headline, fontSize: 16, ...ellipsis }}>{cop(item.avgMonthly)}</span>
                      </span>
                      <span style={{ ...footnote, fontSize: 11 }}>Promedio mensual</span>
                      <div style={{ marginTop: 2 }}>
                        <Bar pct={pctOf(item.avgMonthly)} h={5} />
                      </div>
                    </Card>
                  ))}
                </div>
              </Enter>
            )}
          </>
        )}

        <Enter index={3}>
          <Card style={{ borderRadius: 24 }}>
            <div style={{ ...row, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={headline}>Tendencia</div>
                <div style={{ ...footnote, marginTop: 2 }}>{rangeLabel}</div>
              </div>
              <span aria-hidden style={{ ...row, gap: 4, padding: '6px 10px', borderRadius: 999, background: tk.surface.elevated }}>
                <span style={{ ...footnote, fontWeight: 600, color: tk.text.primary }}>{trend.length} meses</span>
                <ChevronDown size={13} color={tk.text.secondary} strokeWidth={2} />
              </span>
            </div>
            <div style={{ ...row, alignItems: 'flex-end', justifyContent: 'space-evenly', gap: 4 }}>
              {trend.map((x, i) => {
                const isLast = i === trend.length - 1;
                const h = Math.max(Math.round((x.total / maxTrend) * 96), x.total > 0 ? 10 : 4);
                return (
                  <div key={`${x.year}-${x.month}`} style={{ ...col, alignItems: 'center', width: 32 }}>
                    <div style={{ width: 10, height: h, borderRadius: 999, background: isLast ? tk.accent : tk.surface.elevated, transition: 'height 500ms ease-out' }} />
                    <span style={{ ...footnote, fontSize: 10, marginTop: 6, fontWeight: isLast ? 700 : 400, color: isLast ? tk.text.primary : tk.text.secondary }}>{MONTH_ABBR[x.month - 1]}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Enter>

        <Enter index={4}>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '16px 16px 8px' }}>
              <span style={{ ...footnote, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Ranking de categorías</span>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', ...body, color: tk.text.secondary }}>Aún no hay suficiente historial para calcular promedios.</div>
            ) : (
              items.map((item, i) => (
                <div key={item.emoji}>
                  {i > 0 && <div style={{ height: 1, background: tk.border }} />}
                  <div style={{ ...col, gap: 8, padding: 16 }}>
                    <div style={{ ...row, justifyContent: 'space-between' }}>
                      <div style={{ ...row, gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ width: 40, height: 40, borderRadius: 999, background: categoryColor(item.emoji).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {item.emoji}
                        </span>
                        <span style={{ ...body, ...ellipsis }}>{categoryName(item.emoji)}</span>
                      </div>
                      <span style={{ ...body, whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700 }}>{cop(item.avgMonthly)}</span>
                        <span style={footnote}>/mes</span>
                      </span>
                    </div>
                    <Bar pct={pctOf(item.avgMonthly)} h={6} />
                  </div>
                </div>
              ))
            )}
          </Card>
        </Enter>
      </div>
    </div>
  );
}
