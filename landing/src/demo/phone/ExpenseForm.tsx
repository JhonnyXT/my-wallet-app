'use client';

// Réplica de `app/active-expense.tsx` + `CalendarSheet.tsx` (tema oscuro). Crear
// categoría y gestionar métodos de pago se muestran pero quedan fuera de la demo.

import { Banknote, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, FileText, Landmark, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { processVoiceInput } from '../app/voiceParser';
import { PAYMENT_METHODS, TODAY, expenseCategories, incomeCategories, localISOString } from '../data';
import type { DemoApi } from '../useDemo';
import { BLUE, BottomSheet, NAV_H, PressableScale, Touchable, col, cop, moneyInput, row, t } from './ui';

const RED = '#EF4444';
const GREEN = '#22C55E';
const DARK_DISABLED_BG = '#334155';
const DARK_DISABLED_TEXT = '#64748B';
const SUGGESTED_TAGS = ['#viaje', '#trabajo', '#comida', '#salud', '#ocio'];
const TYPE_ICONS: Record<string, typeof Banknote> = { cash: Banknote, debit: CreditCard, savings: Landmark };

// ─── CalendarSheet ───────────────────────────────────────────────────────────────

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function monthGrid(view: Date): (Date | null)[] {
  const y = view.getFullYear();
  const m = view.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const leading = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalendarSheet({ visible, selected, accent, onSelect, onClose }: { visible: boolean; selected: Date; accent: string; onSelect: (d: Date) => void; onClose: () => void }) {
  const today = startOfDay(TODAY);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [visible, selected]);
  const grid = useMemo(() => monthGrid(view), [view]);
  const label = view.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const nextDisabled = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
  const pick = (d: Date) => {
    onSelect(d);
    onClose();
  };
  const nav: CSSProperties = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ padding: '0 20px 36px' }}>
      <div style={{ ...row, justifyContent: 'space-between' }}>
        <Touchable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={nav} label="Mes anterior">
          <ChevronLeft size={20} color={t.textSub} strokeWidth={2} />
        </Touchable>
        <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
        <Touchable onPress={() => !nextDisabled && setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} disabled={nextDisabled} style={nav} label="Mes siguiente">
          <ChevronRight size={20} color={nextDisabled ? t.textTertiary : t.textSub} strokeWidth={2} />
        </Touchable>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Touchable onPress={() => pick(today)} style={{ marginTop: 12, marginBottom: 4, padding: '6px 16px', borderRadius: 9999, border: `1.5px solid ${accent}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>Hoy</span>
        </Touchable>
      </div>
      <div style={{ ...row, marginTop: 16, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <span key={w} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 700, color: t.textTertiary }}>
            {w}
          </span>
        ))}
      </div>
      <div key={`${view.getFullYear()}-${view.getMonth()}`} style={{ display: 'flex', flexWrap: 'wrap', animation: 'fade-in 180ms both' }}>
        {grid.map((date, i) => {
          const cell: CSSProperties = { width: `${100 / 7}%`, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' };
          if (!date) return <span key={`e${i}`} style={cell} />;
          const future = date > today;
          const sel = sameDay(date, selected);
          const isToday = sameDay(date, today);
          return (
            <Touchable key={date.toISOString()} onPress={() => pick(date)} disabled={future} style={cell}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: sel ? accent : 'transparent',
                  fontSize: 14,
                  fontWeight: sel || isToday ? 700 : 500,
                  color: sel ? '#FFFFFF' : future ? t.textTertiary : isToday ? accent : t.text,
                  opacity: future ? 0.4 : 1,
                }}
              >
                {date.getDate()}
              </span>
            </Touchable>
          );
        })}
      </div>
    </BottomSheet>
  );
}

// ─── Pantalla ──────────────────────────────────────────────────────────────────

export function ExpenseForm({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const f = state.form;
  const set = (patch: Partial<typeof f>) => dispatch({ type: 'form', patch });
  const isExpense = f.isExpense;
  const accent = isExpense ? RED : GREEN;
  const accentBg = isExpense ? '#FEF2F2' : '#F0FDF4';
  const accentText = isExpense ? '#B91C1C' : '#15803D';
  const title = isExpense ? 'Nuevo Gasto' : 'Nuevo Ingreso';

  const [amountEditing, setAmountEditing] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [descOpen, setDescOpen] = useState(false);
  const [descClosing, setDescClosing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Parser reactivo: fecha/categoría solo si hay palabras clave explícitas.
  const reactive = f.mode === 'new' && f.source !== 'bank';
  const onNote = (note: string) => {
    const patch: Partial<typeof f> = { note };
    const text = note.trim();
    if (reactive && text.length >= 2) {
      const parsed = processVoiceInput(text);
      if (parsed._dateDetected && parsed.date === 'today') patch.date = null;
      if (parsed._categoryDetected && parsed.categoryEmoji) patch.emoji = parsed.categoryEmoji;
    }
    set(patch);
  };

  const toggleDesc = () => {
    if (descOpen) closeDesc();
    else {
      setDescOpen(true);
      setTimeout(() => noteRef.current?.focus({ preventScroll: true }), 260);
    }
  };
  const closeDesc = () => {
    setDescClosing(true);
    setTimeout(() => {
      setDescOpen(false);
      setDescClosing(false);
    }, 160);
  };

  const commitAmount = () => {
    const parsed = parseFloat(amountDisplay.replace(/\D/g, '')) || 0;
    set({ amount: parsed });
    setAmountEditing(false);
  };

  const effectiveDate = f.date ? new Date(f.date) : TODAY;
  const dateLabel = effectiveDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const displayTags = f.tags.length > 0 ? f.tags : SUGGESTED_TAGS;
  const displayAmt = `${isExpense ? '−' : '+'} ${f.amount > 0 ? cop(f.amount) : '$ 0'}`;
  const placeholder = isExpense ? 'Describe tu gasto aquí' : 'Describe tu ingreso aquí';
  const dynamic = (amt: number): CSSProperties => {
    const digits = amt > 0 ? Math.floor(Math.log10(amt)) + 1 : 1;
    if (digits >= 9) return { fontSize: 36, lineHeight: '42px', letterSpacing: -1 };
    if (digits >= 7) return { fontSize: 48, lineHeight: '56px', letterSpacing: -1.5 };
    if (digits >= 6) return { fontSize: 56, lineHeight: '64px', letterSpacing: -2 };
    return {};
  };
  const cats = isExpense ? expenseCategories() : incomeCategories();
  const divider: CSSProperties = { height: 1, background: t.border, transform: 'scaleY(0.5)' };
  const cardRow: CSSProperties = { ...row, justifyContent: 'center', gap: 12, padding: '14px 0', width: '100%' };
  const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 };
  const disabled = f.amount <= 0;
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag) {
      set({ tags: f.tags.includes(`#${tag}`) ? f.tags : [...f.tags, `#${tag}`] });
      setTagInput('');
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...row, justifyContent: 'space-between', padding: `${28 + 10}px 24px 14px`, background: t.bg }}>
        <PressableScale onPress={() => dispatch({ type: 'back' })} label="Cerrar" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} color={t.textSub} strokeWidth={2} />
        </PressableScale>
        <span style={{ fontSize: 20, fontWeight: 700, color: t.text, letterSpacing: -0.4 }}>{title}</span>
        <span style={{ width: 36, height: 36 }} />
      </div>

      <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 140px' }}>
        {/* Tarjeta: importe + descripción + fecha */}
        <div style={{ background: t.surface, borderRadius: 20, padding: '20px 20px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, textAlign: 'center', letterSpacing: 1 }}>IMPORTE</div>
          <div style={{ ...col, alignItems: 'center', justifyContent: 'center', padding: '8px 0 14px', width: '100%' }}>
            {amountEditing ? (
              <div style={{ ...row, alignItems: 'baseline', justifyContent: 'center', gap: 4, width: '100%' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: accent }}>{isExpense ? '−' : '+'} $</span>
                <input
                  ref={amountRef}
                  inputMode="numeric"
                  aria-label="Importe"
                  value={amountDisplay}
                  onChange={(e) => setAmountDisplay(moneyInput(e.target.value).slice(0, 13))}
                  onBlur={commitAmount}
                  onKeyDown={(e) => e.key === 'Enter' && commitAmount()}
                  placeholder="0"
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: -1,
                    lineHeight: '48px',
                    color: accent,
                    width: `${Math.max(1, amountDisplay.length) * 0.6 + 0.4}em`,
                    minWidth: 60,
                    maxWidth: '100%',
                    padding: '0 4px',
                    textAlign: 'center',
                    background: 'transparent',
                    border: 0,
                    outline: 'none',
                    caretColor: accent,
                    ...dynamic(parseFloat(amountDisplay.replace(/\D/g, '')) || 0),
                  }}
                  className="placeholder:opacity-35"
                />
              </div>
            ) : (
              <Touchable
                onPress={() => {
                  setAmountDisplay(f.amount > 0 ? moneyInput(String(Math.round(f.amount))) : '');
                  setAmountEditing(true);
                  setTimeout(() => amountRef.current?.focus({ preventScroll: true }), 50);
                }}
                label="Editar importe"
                style={{ width: '100%', textAlign: 'center' }}
              >
                <span
                  style={{ display: 'block', fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: '48px', color: accent, whiteSpace: 'nowrap', ...dynamic(f.amount) }}
                >
                  {displayAmt}
                </span>
              </Touchable>
            )}
          </div>
          <div style={divider} />
          <Touchable onPress={toggleDesc} style={cardRow} label="Descripción">
            <FileText size={18} color={t.textSub} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: f.note ? t.text : t.textTertiary,
                textAlign: 'center',
                maxWidth: '82%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {f.note || placeholder}
            </span>
          </Touchable>
          <div style={divider} />
          <Touchable onPress={() => setCalendarOpen(true)} style={cardRow} label="Fecha">
            <Calendar size={18} color={t.textSub} strokeWidth={1.8} />
            <span style={{ fontSize: 15, fontWeight: 500, color: t.text }}>{dateLabel}</span>
          </Touchable>
        </div>

        {/* Descripción + tags */}
        {descOpen && (
          <div
            style={{
              position: 'relative',
              marginTop: 12,
              borderRadius: 16,
              border: `1px solid ${t.border}`,
              background: t.surface,
              overflow: 'hidden',
              animation: descClosing ? 'fade-out-up 160ms both' : 'fade-in-down 220ms cubic-bezier(0.33,1,0.68,1) both',
            }}
          >
            <Touchable
              onPress={closeDesc}
              label="Listo"
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 26, height: 26, borderRadius: 13, background: `${accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Check size={14} color={accent} strokeWidth={2.75} />
            </Touchable>
            <textarea
              ref={noteRef}
              value={f.note}
              onChange={(e) => onNote(e.target.value)}
              placeholder={placeholder}
              aria-label="Descripción"
              rows={2}
              className="placeholder:text-[#6E7681]"
              style={{
                display: 'block',
                width: '100%',
                minHeight: 72,
                padding: '16px 44px 16px 16px',
                fontSize: 15,
                color: t.text,
                lineHeight: '22px',
                background: 'transparent',
                border: 0,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div className="[scrollbar-width:none]" style={{ ...row, gap: 8, padding: '0 16px 14px', overflowX: 'auto' }}>
              {displayTags.map((tag) => {
                const on = f.tags.includes(tag);
                return (
                  <Touchable
                    key={tag}
                    onPress={() => set({ tags: on ? f.tags.filter((x) => x !== tag) : [...f.tags, tag] })}
                    style={{ padding: '7px 14px', borderRadius: 9999, border: `1px solid ${on ? accentBg : t.border}`, background: on ? accentBg : t.bg, flexShrink: 0 }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: on ? accentText : t.textSub }}>{tag}</span>
                  </Touchable>
                );
              })}
              <span style={{ ...row, gap: 4, padding: '7px 12px', background: t.bg, borderRadius: 9999, border: `1px dashed ${t.border}`, flexShrink: 0 }}>
                <Plus size={11} color={t.textTertiary} strokeWidth={2} />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="tag"
                  aria-label="Nuevo tag"
                  className="placeholder:text-[#6E7681]"
                  style={{ fontSize: 12, width: 40, padding: 0, color: t.text, background: 'transparent', border: 0, outline: 'none' }}
                />
              </span>
            </div>
          </div>
        )}

        {/* Categoría */}
        <div style={sectionLabel}>CATEGORÍA</div>
        <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ ...row, alignItems: 'flex-start', gap: 16, paddingRight: 8, paddingTop: 2, overflowX: 'auto', margin: '0 -24px', padding: '2px 24px 0' }}>
          {cats.map((c) => {
            const sel = f.emoji === c.emoji;
            return (
              <Touchable key={c.id} onPress={() => set({ emoji: c.emoji })} style={{ ...col, alignItems: 'center', gap: 6, width: 64, flexShrink: 0 }}>
                <span style={{ position: 'relative' }}>
                  <span
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      background: sel ? `${accent}33` : 'rgba(255,255,255,0.06)',
                      border: sel ? `2px solid ${accent}` : '2px solid transparent',
                      transition: 'background 150ms, border-color 150ms',
                    }}
                  >
                    {c.emoji}
                  </span>
                  {sel && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 18,
                        height: 18,
                        borderRadius: 9999,
                        background: accent,
                        border: `2px solid ${t.bg}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'popup-in 160ms both',
                      }}
                    >
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? t.text : t.textSub, textAlign: 'center', letterSpacing: 0.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 64 }}>
                  {c.name}
                </span>
              </Touchable>
            );
          })}
          {/* Crear categoría: fuera de la demo, solo se muestra. */}
          <span aria-hidden style={{ ...col, alignItems: 'center', gap: 6, width: 64, flexShrink: 0 }}>
            <span style={{ width: 56, height: 56, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', border: `1.5px dashed ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={22} color={accent} strokeWidth={2.5} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>Nueva</span>
          </span>
        </div>

        {/* Cuenta */}
        <div style={sectionLabel}>CUENTA</div>
        <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          {PAYMENT_METHODS.map((m, i) => {
            const Icon = TYPE_ICONS[m.type] ?? Banknote;
            const sel = m.id === f.account;
            return (
              <div key={m.id}>
                <Touchable onPress={() => set({ account: m.id })} style={{ ...row, gap: 12, padding: '14px 16px', width: '100%', background: sel ? `${accent}14` : 'transparent' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: sel ? `${accent}22` : t.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={sel ? accent : t.textSub} strokeWidth={1.8} />
                  </span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: sel ? 700 : 600, color: sel ? accent : t.text }}>{m.name}</span>
                  {sel && <CheckCircle2 size={18} color={accent} strokeWidth={2} />}
                </Touchable>
                {i < PAYMENT_METHODS.length - 1 && <div style={{ ...divider, marginLeft: 66 }} />}
              </div>
            );
          })}
        </div>
        <span aria-hidden style={{ ...row, gap: 8, padding: '14px 4px 0' }}>
          <Plus size={16} color={t.textSub} strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Gestionar métodos de pago</span>
        </span>
      </div>

      {/* Guardar, fijo abajo */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `32px 24px ${NAV_H + 12}px` }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${t.bg}00 0%, ${t.bg} 45%, ${t.bg} 100%)`, pointerEvents: 'none' }} />
        <PressableScale
          onPress={() => dispatch({ type: 'saveForm' })}
          disabled={disabled}
          label="Guardar"
          style={{
            position: 'relative',
            width: '100%',
            ...row,
            justifyContent: 'center',
            gap: 8,
            padding: '16px 0',
            borderRadius: 28,
            background: disabled ? DARK_DISABLED_BG : BLUE,
            boxShadow: disabled ? 'none' : `0 4px 8px ${BLUE}4D`,
            transition: 'background 200ms, transform 140ms',
          }}
        >
          <Check size={18} color={disabled ? DARK_DISABLED_TEXT : '#FFFFFF'} strokeWidth={3} />
          <span style={{ color: disabled ? DARK_DISABLED_TEXT : '#fff', fontSize: 16, fontWeight: 700 }}>Guardar</span>
        </PressableScale>
      </div>

      <CalendarSheet
        visible={calendarOpen}
        selected={effectiveDate}
        accent={accent}
        onSelect={(d) => {
          const base = f.date ? new Date(f.date) : new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), new Date().getHours(), new Date().getMinutes());
          set({ date: sameDay(d, TODAY) && !f.date ? null : localISOString(new Date(d.getFullYear(), d.getMonth(), d.getDate(), base.getHours(), base.getMinutes())) });
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}
