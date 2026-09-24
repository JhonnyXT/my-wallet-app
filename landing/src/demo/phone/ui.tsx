'use client';

// Piezas compartidas de las pantallas del teléfono: el tema oscuro de la app
// (`src/theme/index.ts` y `src/theme/tokens.ts`), los formatos de monto y los
// componentes base (`PressableScale`, `BottomSheet`, `ConfirmDialog`). Las
// medidas están en dp de la app: el teléfono renderiza a 400 px de ancho lógico
// y escala, así los valores de los `StyleSheet` se copian tal cual.

import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** `dark` de `src/theme/index.ts`. */
export const t = {
  bg: '#0D1117',
  surface: '#161B22',
  border: '#30363D',
  text: '#E6EDF3',
  textSub: '#8B949E',
  textTertiary: '#6E7681',
  itemBg: '#21262D',
  pillNeutral: '#21262D',
  inputBg: '#30363D',
  accent: '#4B82EF',
} as const;

/** `tokenColors.dark` de `src/theme/tokens.ts`. */
export const tk = {
  surface: { primary: '#0D1117', secondary: '#1C1C1F', elevated: '#2A2A2E' },
  text: { primary: '#E6EDF3', secondary: '#8B949E' },
  border: '#30363D',
  accent: '#4B82EF',
} as const;

export const BLUE = '#135BEC';
export const STATUS_H = 28;
export const NAV_H = 44;

/** `fmtCOP` / `formatCOP`: "$ 45.000". */
export const cop = (n: number) =>
  `$ ${Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
/** `formatBalance`: "$45.000". */
export const bal = (n: number) =>
  `$${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
/** `formatMoneyInput`: solo dígitos, con puntos de miles. */
export const moneyInput = (text: string) => {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const row: CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' };
export const col: CSSProperties = { display: 'flex', flexDirection: 'column' };
export const absFill: CSSProperties = { position: 'absolute', inset: 0 };

/** `PressableScale`: escala a 0.97 al presionar (spring `snappy`, 140 ms). */
export function PressableScale({
  onPress,
  style,
  children,
  disabled,
  label,
  className = '',
}: {
  onPress?: () => void;
  style?: CSSProperties;
  children: ReactNode;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className={`cursor-pointer transition-transform duration-[140ms] active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 ${className}`}
      style={{ border: 0, background: 'transparent', padding: 0, color: 'inherit', font: 'inherit', ...style }}
    >
      {children}
    </button>
  );
}

/** Botón sin estilos (`TouchableOpacity`/`Pressable`): baja la opacidad al tocar. */
export function Touchable({
  onPress,
  style,
  children,
  label,
  disabled,
  className = '',
}: {
  onPress?: () => void;
  style?: CSSProperties;
  children: ReactNode;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className={`cursor-pointer transition-opacity active:opacity-70 disabled:cursor-default ${className}`}
      style={{ border: 0, background: 'transparent', padding: 0, color: 'inherit', font: 'inherit', textAlign: 'inherit', ...style }}
    >
      {children}
    </button>
  );
}

/** Capa de la pantalla del teléfono donde se montan modales y hojas (como
 * `Modal` de RN, que siempre cubre la pantalla completa). */
export const PhoneContext = createContext<{ host: HTMLElement | null; scale: number }>({ host: null, scale: 1 });
export const usePhone = () => useContext(PhoneContext);

export function Portal({ children }: { children: ReactNode }) {
  const { host } = usePhone();
  return host ? createPortal(children, host) : null;
}

/** Monta el hijo con una animación de salida: `visible=false` lo mantiene
 * montado `ms` milisegundos para que termine de salir. */
function usePresence(visible: boolean, ms: number) {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(() => setShown(false));
    const out = setTimeout(() => setMounted(false), ms);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(out);
    };
  }, [visible, ms]);
  return { mounted, shown };
}

/** `src/components/ui/BottomSheet.tsx`: fondo que cierra al tocar, hoja que
 * sube desde abajo y se cierra arrastrando el handle hacia abajo. */
export function BottomSheet({
  visible,
  onClose,
  children,
  style,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const { mounted, shown } = usePresence(visible, 280);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  if (!mounted) return null;
  return (
    <Portal>
    <div style={{ ...absFill, zIndex: 60, pointerEvents: 'auto' }}>
      <div
        onClick={onClose}
        style={{ ...absFill, background: 'rgba(15,23,42,0.5)', opacity: shown ? 1 : 0, transition: 'opacity 250ms' }}
      />
      <div
        role="dialog"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: t.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
          transform: shown ? `translateY(${drag}px)` : 'translateY(110%)',
          transition: dragging ? 'none' : 'transform 280ms cubic-bezier(.2,.8,.3,1)',
          ...style,
        }}
      >
        <div
          style={{ paddingTop: 14, paddingBottom: 14, display: 'flex', justifyContent: 'center', cursor: 'grab', touchAction: 'none' }}
          onPointerDown={(e) => {
            start.current = e.clientY;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            const d = drag;
            start.current = null;
            setDragging(false);
            setDrag(0);
            if (d > 80) onClose();
          }}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setDrag(0);
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
        </div>
        {children}
      </div>
    </div>
    </Portal>
  );
}

/** Modal centrado con fade (`Modal animationType="fade"`). */
export function FadeModal({
  visible,
  onClose,
  children,
  backdrop = 'rgba(0,0,0,0.55)',
  scale = false,
  style,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  backdrop?: string;
  scale?: boolean;
  style?: CSSProperties;
}) {
  const { mounted, shown } = usePresence(visible, 200);
  if (!mounted) return null;
  return (
    <Portal>
    <div
      onClick={onClose}
      style={{
        ...absFill,
        zIndex: 70,
        pointerEvents: 'auto',
        background: backdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: shown ? 1 : 0,
        transition: 'opacity 200ms',
        ...style,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', transform: scale ? `scale(${shown ? 1 : 0.9})` : undefined, transition: 'transform 220ms cubic-bezier(.2,.9,.3,1.2)' }}
      >
        {children}
      </div>
    </div>
    </Portal>
  );
}

const DIALOG = {
  danger: { Icon: Trash2, iconColor: '#DC2626', iconBg: '#FEE2E2', btnBg: '#DC2626' },
  warning: { Icon: AlertTriangle, iconColor: '#D97706', iconBg: '#FEF3C7', btnBg: '#D97706' },
  info: { Icon: Info, iconColor: BLUE, iconBg: '#DBEAFE', btnBg: BLUE },
};

/** `src/components/ui/ConfirmDialog.tsx`. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: keyof typeof DIALOG;
}) {
  const cfg = DIALOG[variant];
  return (
    <FadeModal visible={visible} onClose={onCancel} backdrop="rgba(0,0,0,0.45)" scale style={{ padding: '0 36px' }}>
      <div
        style={{
          ...col,
          width: '100%',
          alignItems: 'center',
          background: t.surface,
          borderRadius: 24,
          padding: '32px 24px 24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 28, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <cfg.Icon size={24} color={cfg.iconColor} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: t.text, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>{title}</span>
        <span style={{ fontSize: 14, color: t.textSub, textAlign: 'center', lineHeight: '21px', marginBottom: 24 }}>{message}</span>
        <div style={{ ...row, gap: 12, width: '100%' }}>
          <PressableScale onPress={onCancel} style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: t.inputBg }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.textSub }}>Cancelar</span>
          </PressableScale>
          <PressableScale onPress={onConfirm} style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: cfg.btnBg }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{confirmLabel}</span>
          </PressableScale>
        </div>
      </div>
    </FadeModal>
  );
}

/** Scroll horizontal que además se arrastra con el mouse (en táctil es nativo). */
export function HScroll({ children, style, disabled }: { children: ReactNode; style?: CSSProperties; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const moved = useRef(false);
  return (
    <div
      ref={ref}
      className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ overflowX: disabled ? 'hidden' : 'auto', overflowY: 'hidden', ...style }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return;
        drag.current = { x: e.clientX, left: ref.current.scrollLeft };
        moved.current = false;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || !ref.current || disabled) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 6) moved.current = true;
        if (moved.current) ref.current.scrollLeft = d.left - dx;
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerLeave={() => {
        drag.current = null;
      }}
      onClickCapture={(e) => {
        // Un arrastre no es un tap.
        if (moved.current) {
          e.stopPropagation();
          moved.current = false;
        }
      }}
    >
      {children}
    </div>
  );
}
