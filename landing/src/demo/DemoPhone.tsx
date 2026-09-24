'use client';

// El teléfono de la portada: MyWallet con datos de ejemplo. Cada pantalla es
// una réplica de la app (`phone/*`), renderizada a 400 dp de ancho lógico y
// escalada al marco, para copiar las medidas de los `StyleSheet` tal cual.

import { Battery, Signal, Wifi } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BANK_NOTIFS } from '@/content/app';
import { PhoneFrame } from '@/components/PhoneFrame';
import { top, type DemoApi, type Screen } from './useDemo';
import { Dashboard } from './phone/Dashboard';
import { ExpenseForm } from './phone/ExpenseForm';
import { BatchReview, NotificationReview } from './phone/Reviews';
import { Reports } from './phone/Reports';
import { VoiceInput } from './phone/VoiceInput';
import { NAV_H, PhoneContext, STATUS_H, t } from './phone/ui';

const W = 400;
const INNER_W = 364; // 380 - borde de 8 px a cada lado
const INNER_H = 764;
const SCALE = INNER_W / W;
const H = INNER_H / SCALE;

function StatusBar() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: STATUS_H,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 26px 0',
        color: t.text,
        fontSize: 13,
        fontWeight: 600,
        pointerEvents: 'none',
      }}
    >
      <span>10:30</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <Signal size={14} strokeWidth={2.4} />
        <Wifi size={14} strokeWidth={2.4} />
        <Battery size={17} strokeWidth={2} />
      </span>
    </div>
  );
}

/** Barra de navegación de Android (tres botones, como el Samsung de pruebas). */
function NavBar({ api }: { api: DemoApi }) {
  const btn = 'flex h-full flex-1 cursor-pointer items-center justify-center active:bg-white/5';
  return (
    <div
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: NAV_H, zIndex: 90, display: 'flex', background: 'rgba(13,17,23,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <span className={btn} aria-hidden style={{ cursor: 'default' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#C9D1D9" strokeWidth="1.8">
          <path d="M5 3v12M9 3v12M13 3v12" />
        </svg>
      </span>
      <button type="button" aria-label="Inicio" className={btn} onClick={() => api.dispatch({ type: 'home' })} style={{ border: 0, background: 'transparent' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#C9D1D9" strokeWidth="1.8">
          <rect x="3" y="3" width="14" height="14" rx="5" />
        </svg>
      </button>
      <button type="button" aria-label="Atrás" className={btn} onClick={() => api.dispatch({ type: 'back' })} style={{ border: 0, background: 'transparent' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#C9D1D9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 3.5 6 9l5.5 5.5" />
        </svg>
      </button>
    </div>
  );
}

const BANNER_MS = 8000; // como un aviso emergente de Android: se va solo

/** Aviso de MyWallet (`notifyBankTransaction`) sobre la pantalla actual, con
 * el formato de una notificación emergente de Android: ícono circular de la
 * app, "MyWallet · ahora", título y cuerpo. Se descarta deslizándola hacia
 * arriba o sola a los 8 s (y queda en la campana, como en la app). */
function Banner({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const banner = state.banner;
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y0: number } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => dispatch({ type: 'dismissBanner' }), BANNER_MS);
    return () => clearTimeout(id);
  }, [banner, dispatch]);
  if (!banner) return null;
  const n = BANK_NOTIFS[banner.index];
  const item = state.pending.find((p) => p.id === banner.id);
  if (!n.detected || !item) return null;
  return (
    <div
      key={banner.id}
      style={{
        position: 'absolute',
        left: 10,
        right: 10,
        top: STATUS_H + 6,
        zIndex: 95,
        animation: 'notif-in 0.35s cubic-bezier(.2,.8,.3,1) both',
      }}
    >
      <button
        type="button"
        aria-label={`Nuevo ${item.isExpense ? 'gasto' : 'ingreso'} detectado — ${n.bank}: ${item.description}. Toca para revisar.`}
        onPointerDown={(e) => {
          drag.current = { y0: e.clientY };
          moved.current = false;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const delta = e.clientY - d.y0;
          if (Math.abs(delta) > 6) moved.current = true;
          setDy(Math.min(0, delta));
        }}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
          if (moved.current && dy < -30) dispatch({ type: 'dismissBanner' });
          setDy(0);
        }}
        onClick={() => {
          if (!moved.current) dispatch({ type: 'openBanner' });
        }}
        className="cursor-pointer active:brightness-110"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          padding: '14px 18px 14px 14px',
          borderRadius: 28,
          border: 0,
          background: '#2B3038',
          boxShadow: '0 16px 30px rgba(0,0,0,0.55)',
          color: t.text,
          textAlign: 'left',
          touchAction: 'none',
          transform: `translateY(${dy}px)`,
          opacity: 1 + dy / 120,
          transition: dragging ? 'none' : 'transform 250ms, opacity 250ms',
        }}
      >
        <span style={{ width: 40, height: 40, borderRadius: 9999, overflow: 'hidden', background: '#1796FE', flexShrink: 0, display: 'flex' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/mywallet-icon.png" alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover', transform: 'scale(1.3)' }} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 12, color: t.textSub, lineHeight: '16px' }}>MyWallet · ahora</span>
          <span style={{ fontSize: 15, fontWeight: 700, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Nuevo {item.isExpense ? 'gasto' : 'ingreso'} detectado — {n.bank}
          </span>
          <span style={{ fontSize: 14, color: '#C9D1D9', lineHeight: '19px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.description}
          </span>
        </span>
      </button>
    </div>
  );
}

function ScreenView({ screen, api }: { screen: Screen; api: DemoApi }) {
  switch (screen) {
    case 'home':
      return <Dashboard api={api} />;
    case 'form':
      return <ExpenseForm api={api} />;
    case 'voice':
      return <VoiceInput api={api} />;
    case 'batch':
      return <BatchReview api={api} />;
    case 'notifReview':
      return <NotificationReview api={api} />;
    case 'reports':
      return <Reports api={api} />;
  }
}

export function DemoPhone({ api }: { api: DemoApi }) {
  const { state } = api;
  const canvas = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(SCALE);

  // Escala real en pantalla (en móvil el marco se reduce al 80%).
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const update = () => setScale(el.getBoundingClientRect().width / W || SCALE);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = top(state);
  return (
    <PhoneFrame>
      <div
        ref={canvas}
        style={{
          position: 'relative',
          width: W,
          height: H,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          background: t.bg,
          color: t.text,
          fontFamily: 'var(--font-roboto), Roboto, system-ui, sans-serif',
          lineHeight: 1.2,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <PhoneContext.Provider value={{ host, scale }}>
          {state.stack.map((screen, i) => (
            <div
              key={screen === 'form' ? `form-${state.formN}` : `${screen}-${i}`}
              aria-hidden={screen !== current}
              inert={screen !== current}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: i + 1,
                // `fullScreenModal`: las pantallas suben desde abajo.
                animation: i > 0 ? 'screen-up 320ms cubic-bezier(.2,.8,.3,1) both' : undefined,
              }}
            >
              <ScreenView screen={screen} api={api} />
            </div>
          ))}
          {/* Capa de modales y hojas (como `Modal` de RN). */}
          <div ref={setHost} style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none' }} />
        </PhoneContext.Provider>
        <StatusBar />
        <Banner api={api} />
        <NavBar api={api} />
      </div>
    </PhoneFrame>
  );
}
