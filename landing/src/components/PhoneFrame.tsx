import type { ReactNode } from 'react';

/** Marco de teléfono de 380×780 (se escala al 80% en móvil), con cámara. El
 * contenido ocupa todo el alto (la barra de navegación la dibuja la demo). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-[624px] w-[304px] sm:h-[780px] sm:w-[380px]">
      <div className="relative h-[780px] w-[380px] origin-top-left scale-[0.8] overflow-hidden rounded-[58px] border-8 border-[#2a2f36] bg-bg shadow-[0_40px_90px_rgba(0,0,0,0.7),inset_0_0_0_2px_#3a4048] sm:scale-100">
        <div className="pointer-events-none absolute top-3.5 left-1/2 z-50 size-[22px] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}
