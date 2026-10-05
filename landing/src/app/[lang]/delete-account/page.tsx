import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/LegalPage';
import { hasLocale } from '@/i18n/config';
import { legalDocs } from '@/legal/docs';

// URL web para pedir la eliminación de la cuenta que exige Google Play (Data safety → "Delete
// account URL"). Explica cómo hacerlo desde la app y, sin la app, pedirlo por correo.
export async function generateMetadata({ params }: PageProps<'/[lang]/delete-account'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: `${legalDocs.deleteAccount[lang].title} · MyWallet`,
    alternates: {
      canonical: `/${lang}/delete-account`,
      languages: { es: '/es/delete-account', en: '/en/delete-account' },
    },
  };
}

export default async function Page({ params }: PageProps<'/[lang]/delete-account'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <LegalPage doc={legalDocs.deleteAccount[lang]} locale={lang} path="/delete-account" />;
}
