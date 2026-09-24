import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { DemoSection } from '@/demo/DemoSection';
import { Bancos } from '@/components/sections/Bancos';
import { Control } from '@/components/sections/Control';
import { Detalles } from '@/components/sections/Detalles';
import { FinalCta } from '@/components/sections/FinalCta';
import { Footer } from '@/components/sections/Footer';
import { Hero } from '@/components/sections/Hero';
import { Pantallas } from '@/components/sections/Pantallas';
import { Privacidad } from '@/components/sections/Privacidad';
import { Promedios } from '@/components/sections/Promedios';
import { Registro } from '@/components/sections/Registro';
import { Divider } from '@/components/sections/shared';
import { Voz } from '@/components/sections/Voz';
import { getDictionary, hasLocale } from '@/i18n/config';

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <Header t={t.nav} locale={lang} />
      <main className="flex flex-col items-center pb-8">
        <Hero t={t} locale={lang} />
        <DemoSection t={t.demo} />
        <Divider />
        <Registro t={t.registro} />
        <Divider />
        <Voz t={t.voz} />
        <Divider />
        <Bancos t={t.bancos} />
        <Divider />
        <Promedios t={t.promedios} />
        <Divider />
        <Control t={t.control} />
        <Divider />
        <Detalles t={t.detalles} />
        <Pantallas t={t.pantallas} />
        <Privacidad t={t.privacidad} policyLabel={t.footer.privacy} />
        <FinalCta t={t} locale={lang} />
        <Footer t={t.footer} />
      </main>
    </>
  );
}
