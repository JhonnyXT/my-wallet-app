import { Check, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, hasLocale } from '@/i18n/config';

/** Página a la que llega `/api/unsubscribe` tras procesar la baja. No tiene
 * formulario propio (no expone "escribe tu email para darte de baja", que
 * invitaría a dar de baja a cualquiera): solo confirma el resultado del enlace
 * que llega dentro de un email. */
export default async function Page({ params, searchParams }: PageProps<'/[lang]/unsubscribed'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { ok } = await searchParams;
  const s = getDictionary(lang).unsubscribe;
  const success = ok !== '0';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center gap-5 px-6 text-center">
      <Image src="/img/mywallet-icon.png" alt="" width={56} height={56} />
      <div className={`flex size-14 items-center justify-center rounded-full ${success ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense'}`}>
        {success ? <Check size={26} /> : <X size={26} />}
      </div>
      <h1 className="text-2xl font-extrabold">{success ? s.okTitle : s.errorTitle}</h1>
      <p className="text-[15px] leading-relaxed text-dim">{success ? s.okBody : s.errorBody}</p>
      <Link href={`/${lang}`} className="mt-2 rounded-full bg-surface-2 px-5 py-2.5 text-sm font-semibold hover:bg-line">
        {s.backHome}
      </Link>
    </main>
  );
}
