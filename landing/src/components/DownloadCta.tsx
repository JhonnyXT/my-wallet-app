import { Download } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';

// Mismo enlace que usa joblanstudio.vercel.app en `content/labs.ts`: siempre el último release de
// GitHub, así que apuntar aquí no exige tocar esta landing cada vez que se publique una versión
// nueva (ver AGENTS.md → "Release del APK en GitHub").
export const APK_DOWNLOAD_URL = 'https://github.com/JhonnyXT/my-wallet-app/releases/latest/download/MyWallet.apk';

export function DownloadCta({
  t,
  className = '',
}: {
  t: Dictionary['download'];
  className?: string;
}) {
  return (
    <div className={`flex w-full max-w-[480px] flex-col items-center gap-2.5 ${className}`}>
      <p className="text-[13px] font-semibold text-dim">{t.label}</p>
      <a
        href={APK_DOWNLOAD_URL}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-btn px-[22px] text-[15px] font-bold whitespace-nowrap text-white transition-colors hover:bg-btn-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:rounded-full"
      >
        {t.cta}
        <Download size={17} strokeWidth={2.5} aria-hidden />
      </a>
      <p className="text-center text-xs text-faint sm:text-[13px]">{t.hint}</p>
    </div>
  );
}
