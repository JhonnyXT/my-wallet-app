import Image from 'next/image';
import type { Dictionary } from '@/i18n/config';
import { ISSUES_URL, PRIVACY_URL, REPO_URL } from '@/lib/links';

export function Footer({ t }: { t: Dictionary['footer'] }) {
  return (
    <footer className="mx-auto flex w-[calc(100%-40px)] max-w-[760px] flex-col items-center gap-3 border-t border-line pt-8 pb-7 sm:gap-3.5 sm:pt-10 sm:pb-12">
      <Image src="/img/mywallet-icon.png" alt="" width={52} height={52} className="size-11 sm:size-[52px]" />
      <span className="text-[17px] font-extrabold sm:text-lg">MyWallet</span>
      <nav aria-label="Footer" className="flex flex-wrap justify-center gap-[18px] text-sm sm:gap-[22px]">
        <a href={PRIVACY_URL} className="text-dim hover:text-ink">
          {t.privacy}
        </a>
        <a href={REPO_URL} className="text-dim hover:text-ink">
          {t.source}
        </a>
        <a href={ISSUES_URL} className="text-dim hover:text-ink">
          {t.support}
        </a>
      </nav>
      <span className="text-xs text-faint">{t.rights}</span>
    </footer>
  );
}
