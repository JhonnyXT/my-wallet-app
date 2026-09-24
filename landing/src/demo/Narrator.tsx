'use client';

import { ArrowDown, ArrowUp, ChartColumn, Landmark, Mic, Plus, SendHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Dictionary } from '@/i18n/config';
import { BANK_NOTIFS, cop } from '@/content/app';
import { TxRow } from '@/components/TxRow';
import { SUGGESTED_PHRASES, categoryColor, categoryName, type DemoTx } from './data';
import { formatDate } from './phone/TransactionItem';
import { monthSpentBy, top, type DemoApi, type Heard } from './useDemo';

type T = Dictionary['demo'];

const bal = (n: number) => (n < 0 ? '-' : '') + cop(n).replace('$ ', '$');
const toRow = (tx: DemoTx) => ({
  emoji: tx.emoji,
  category: categoryName(tx.emoji),
  tint: categoryColor(tx.emoji).bg,
  date: formatDate(tx.date),
  title: tx.description,
  amount: Math.abs(tx.amount),
  income: tx.amount < 0,
});

/** Controles para "dictar" una frase escrita o sugerida en la pantalla de voz. */
function Dictation({ api, t }: { api: DemoApi; t: T }) {
  const [text, setText] = useState('');
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) api.dispatch({ type: 'dictate', text });
  };
  return (
    <div className="flex flex-col gap-2.5">
      <form onSubmit={send} className="flex gap-2">
        <label htmlFor="demo-voice" className="sr-only">
          {t.voiceType}
        </label>
        <input
          id="demo-voice"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.voicePlaceholder}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none placeholder:text-mute focus:border-accent"
        />
        <button type="submit" aria-label={t.voiceSend} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-btn text-white hover:bg-btn-hover">
          <SendHorizontal size={18} />
        </button>
      </form>
      <span className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">{t.voiceSuggested}</span>
      {SUGGESTED_PHRASES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => {
            setText(p);
            api.dispatch({ type: 'dictate', text: p });
          }}
          className="min-h-11 cursor-pointer rounded-[14px] border border-line bg-bg px-3.5 text-left text-[13px] font-semibold hover:border-[#484f58]"
        >
          “{p}”
        </button>
      ))}
    </div>
  );
}

function Chips({ heard, t }: { heard: Heard[]; t: T }) {
  const chip = 'flex animate-row-in items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-bold';
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">{t.understood}</span>
      {heard.map((h, i) => {
        return (
          <div key={i} className="flex flex-wrap gap-1.5">
            <span className={`${chip} ${!h.isExpense ? 'bg-income-bg text-income-ink' : 'bg-expense-bg text-expense-ink'}`}>
              {!h.isExpense ? <ArrowUp size={12} strokeWidth={2.8} /> : <ArrowDown size={12} strokeWidth={2.8} />}
              {!h.isExpense ? t.income : t.expense}
            </span>
            <span className={`${chip} bg-surface-2 font-mono`}>{cop(h.amount)}</span>
            <span className={`${chip} bg-surface-2`}>
              {h.emoji} {categoryName(h.emoji)}
            </span>
            {h.today && <span className={`${chip} bg-surface-2`}>{t.today}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Budget({ emoji, api, t }: { emoji: string; api: DemoApi; t: T }) {
  const limit = api.state.budgets[emoji];
  if (!limit) return null;
  const spent = monthSpentBy(api.state.txs)[emoji] ?? 0;
  const pct = Math.round((spent / limit) * 100);
  const c = { name: categoryName(emoji), colorAccent: categoryColor(emoji).accent };
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'near' : 'ok';
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex justify-between text-sm">
        <span>
          {t.budget} · {c.name}
        </span>
        <b className={state === 'over' ? 'text-expense' : state === 'near' ? 'text-warn' : 'text-dim'}>{pct}%</b>
      </span>
      <span className="block h-2 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, pct)}%`, background: state === 'over' ? 'var(--color-expense)' : c.colorAccent }}
        />
      </span>
      <span className="text-xs text-dim">{t.budgetNote[state]}</span>
    </div>
  );
}

function Balance({ from, to, t }: { from: number; to: number; t: T }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-dashed border-line px-3.5 py-3 text-sm">
      <span className="text-dim">{t.balance}</span>
      <span className="font-mono">
        <span className="text-faint line-through">{bal(from)}</span>
        {'  →  '}
        <b className="text-ink">{bal(to)}</b>
      </span>
    </div>
  );
}

/** Panel que narra lo que acaba de pasar en el teléfono. */
export function Narrator({ api, t }: { api: DemoApi; t: T }) {
  const { state, dispatch } = api;
  const ev = state.event;
  const e = t.ev;

  let eyebrow = '';
  let title = '';
  let body = '';
  let extra: React.ReactNode = null;

  switch (ev.kind) {
    case 'intro':
      ({ eyebrow, title, body } = e.intro);
      break;
    case 'filterType':
      eyebrow = e.filterType.eyebrow;
      title = ev.type === 'income' ? e.filterType.titleIncome : e.filterType.titleExpense;
      body = e.filterType.body;
      break;
    case 'filterCategory': {
      eyebrow = e.filterCategory.eyebrow;
      title = `${ev.emoji} ${categoryName(ev.emoji)}: ${cop(monthSpentBy(state.txs)[ev.emoji] ?? 0)}`;
      body = e.filterCategory.body;
      extra = (
        <>
          <Budget emoji={ev.emoji} api={api} t={t} />
          <button
            type="button"
            onClick={() => dispatch({ type: 'clearCategoryFilter' })}
            className="h-10 cursor-pointer self-start rounded-full border border-line px-4 text-sm font-semibold hover:bg-surface-2"
          >
            ✕ {categoryName(ev.emoji)}
          </button>
        </>
      );
      break;
    }
    case 'deleted':
      eyebrow = e.deleted.eyebrow;
      title = `“${ev.tx.description}” ${e.deleted.title}`;
      body = e.deleted.body;
      extra = (
        <>
          <TxRow tx={toRow(ev.tx)} className="opacity-60" />
          <Balance from={ev.from} to={ev.to} t={t} />
          {state.lastDeleted && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'restore' })}
              className="h-10 cursor-pointer self-start rounded-full border border-line px-4 text-sm font-semibold hover:bg-surface-2"
            >
              {t.undo}
            </button>
          )}
        </>
      );
      break;
    case 'addOpen':
      ({ eyebrow, title, body } = e.addOpen);
      break;
    case 'saved':
      eyebrow = e.saved[ev.source];
      title = ev.txs.length > 1 ? `${ev.txs.length} ${e.saved.titleMany}` : e.saved.titleOne;
      body = e.saved.body;
      extra = (
        <>
          {ev.txs.map((tx) => (
            <TxRow key={tx.id} tx={toRow(tx)} className="animate-row-in" />
          ))}
          <Balance from={ev.from} to={ev.to} t={t} />
          {ev.txs[0].amount > 0 && <Budget emoji={ev.txs[0].emoji} api={api} t={t} />}
        </>
      );
      break;
    case 'voiceOpen':
      ({ eyebrow, title, body } = e.voiceOpen);
      break;
    case 'voiceHeard':
      eyebrow = e.voiceHeard.eyebrow;
      title = ev.heard.length > 1 ? `${ev.heard.length} ${e.voiceHeard.titleMany}` : e.voiceHeard.titleOne;
      body = ev.heard.length > 1 ? e.voiceHeard.bodyMany : e.voiceHeard.bodyOne;
      extra = (
        <>
          <p className="text-xl leading-snug font-bold">“{ev.quote}”</p>
          <Chips heard={ev.heard} t={t} />
        </>
      );
      break;
    case 'voiceEmpty':
      ({ eyebrow, title, body } = e.voiceEmpty);
      extra = <p className="text-xl leading-snug font-bold">“{ev.quote}”</p>;
      break;
    case 'bank': {
      const n = BANK_NOTIFS[ev.index];
      eyebrow = `${e.bank.eyebrow} ${n.bank}`;
      title = n.detected ? e.bank.detectedTitle : e.bank.ignoredTitle;
      body = n.detected ? e.bank.detectedBody : e.bank.ignoredBody;
      extra = (
        <>
          <div className="flex gap-3 rounded-[18px] bg-[#2b3038] px-4 py-3.5">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold"
              style={{ background: n.color, color: n.bank === 'Bancolombia' ? '#1a1a1a' : '#fff' }}
              aria-hidden
            >
              {n.bank[0]}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] text-dim">{n.bank} · ahora</span>
              <span className="text-sm font-bold">{n.title}</span>
              <span className="text-[13px] leading-snug text-[#c9d1d9]">{n.text}</span>
            </span>
          </div>
          {n.detected && (
            <Chips
              heard={[
                {
                  emoji: state.pending.find((p) => p.bankIndex === ev.index)?.emoji ?? n.detected.emoji,
                  amount: n.detected.amount,
                  isExpense: !n.detected.income,
                  today: false,
                },
              ]}
              t={t}
            />
          )}
        </>
      );
      break;
    }
    case 'averages':
      ({ eyebrow, title, body } = e.averages);
      break;
  }

  const action = 'flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold transition-colors';

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div
        key={JSON.stringify(ev)}
        aria-live="polite"
        className="flex min-h-[340px] animate-row-in flex-col gap-3.5 rounded-3xl border border-line bg-card p-6"
      >
        <span className="font-mono text-xs font-bold tracking-[0.12em] text-accent uppercase">{eyebrow}</span>
        <h3 className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">{title}</h3>
        <p className="text-[15px] leading-relaxed text-dim">{body}</p>
        {extra}
        {top(state) === 'voice' && <Dictation api={api} t={t} />}
      </div>
      <span className="mt-1 font-mono text-[11px] font-bold tracking-[0.1em] text-faint uppercase">{t.tryTitle}</span>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => dispatch({ type: 'newForm', isExpense: true })} className={`${action} border-line bg-card hover:border-[#484f58]`}>
          <Plus size={16} className="shrink-0 text-accent" aria-hidden />
          {t.actions.add}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'openVoice' })} className={`${action} border-line bg-card hover:border-[#484f58]`}>
          <Mic size={16} className="shrink-0 text-accent" aria-hidden />
          {t.actions.voice}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'simulateBank' })} className={`${action} border-line bg-card hover:border-[#484f58]`}>
          <Landmark size={16} className="shrink-0 text-accent" aria-hidden />
          {t.actions.bank}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'openReports' })} className={`${action} border-line bg-card hover:border-[#484f58]`}>
          <ChartColumn size={16} className="shrink-0 text-accent" aria-hidden />
          {t.actions.averages}
        </button>
      </div>
    </div>
  );
}
