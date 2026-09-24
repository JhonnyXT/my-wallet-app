import type { Metadata, Viewport } from 'next';
import { Caveat, Inter, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDictionary, hasLocale, locales } from '@/i18n/config';
import '../globals.css';

// La app usa la fuente del sistema (Roboto en Android); Inter es su par más
// cercano en la web. JetBrains Mono para montos y etiquetas; Caveat solo para
// las notas "escritas a mano".
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-jetbrains' });
const caveat = Caveat({ subsets: ['latin'], weight: ['600'], variable: '--font-caveat' });

// Solo /es y /en existen; cualquier otro prefijo es 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: '#0D1117', colorScheme: 'dark' };

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: `/${lang}`, languages: { es: '/es', en: '/en', 'x-default': '/es' } },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === 'es' ? 'es_CO' : 'en_US',
      type: 'website',
      siteName: 'MyWallet',
      images: [{ url: '/img/mywallet-icon.png', width: 512, height: 512, alt: 'MyWallet' }],
    },
    twitter: { card: 'summary', title: t.meta.title, description: t.meta.description },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} className={`${inter.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body className="bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
