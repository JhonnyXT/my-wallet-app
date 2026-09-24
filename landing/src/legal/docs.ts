// Texto de la Política de Privacidad para la landing (Next.js), en el mismo
// formato tipado que usa `meld-app/landing` (repo hermano) para su LegalPage.
//
// Esta es una SEGUNDA copia de la política, pensada para verse bien dentro de
// la landing nueva. La copia "oficial" ante Google Play sigue siendo
// `docs/privacy-policy.html` (GitHub Pages) — esa URL está registrada en Play
// Console y no se cambia (ver `AGENTS.md` § Landing page y GitHub Pages). Si
// cambia algo real (permisos, proveedor de la lista de espera, exportación),
// hay que actualizar AMBOS documentos.

import type { Locale } from '@/i18n/config';

export type LegalSection = { h: string; p?: string[]; list?: string[] };
export type LegalDoc = { title: string; updated: string; intro: string[]; sections: LegalSection[] };

const CONTACT = 'jonathanblandon1017@gmail.com';

const privacyEs: LegalDoc = {
  title: 'Política de privacidad',
  updated: 'Última actualización: septiembre de 2026',
  intro: [
    'MyWallet es una aplicación de control financiero 100% local: todos tus movimientos, presupuestos y metas se guardan únicamente en tu teléfono. No existe un servidor propio, ni cuenta, ni sincronización en la nube. Esta política explica también qué pasa con tu email si te unes a la lista de espera de este sitio.',
  ],
  sections: [
    {
      h: '1. Lo que guardas en la app se queda en tu teléfono',
      p: [
        'Montos, descripciones, categorías, fechas, métodos de pago, presupuestos, metas de ahorro y deudas se guardan en una base de datos local (SQLite) dentro de tu dispositivo. No necesitas crear una cuenta y la app no envía ese contenido a ningún servidor nuestro.',
        'Si desinstalas la app, todo ese contenido se elimina de forma permanente. Puedes exportar un respaldo manual en CSV desde Ajustes antes de hacerlo.',
      ],
    },
    {
      h: '2. Permisos que pide la app y para qué',
      list: [
        'Acceso a notificaciones: para detectar transacciones bancarias leyendo notificaciones de las apps de banco que tú elijas en Ajustes. El procesamiento ocurre 100% en tu dispositivo; solo se extrae el monto y una descripción corta, nunca el texto completo de la notificación, y nunca se leen notificaciones de otras apps (mensajería, redes sociales, etc.).',
        'Micrófono: para transcribir en tiempo real un gasto dictado por voz. Se activa solo mientras usas esa función; la app no graba ni guarda audio en ningún formato.',
        'Almacenamiento (Android 12 o anterior): solo para guardar el archivo CSV cuando exportas tu historial manualmente desde Ajustes.',
      ],
      p: ['Puedes negar o retirar cualquiera de estos permisos desde los ajustes de tu teléfono; solo deja de funcionar la función que lo necesita.'],
    },
    {
      h: '3. Sin analíticas, sin publicidad, sin rastreo',
      p: [
        'La app no incluye herramientas de analítica, publicidad ni rastreo de terceros, no accede a contactos, cámara, ubicación GPS ni SMS, y no vendemos ni compartimos datos con nadie.',
      ],
    },
    {
      h: '4. Sin copia en la nube',
      p: [
        'La base de datos de MyWallet está excluida explícitamente del sistema de copia de seguridad automática de Android: tus datos financieros no se suben a Google Drive ni a ningún otro respaldo automático. Sin copia manual (CSV) previa, desinstalar la app borra tus datos para siempre.',
      ],
    },
    {
      h: '5. Este sitio web y la lista de espera',
      p: [
        `Si te unes a la lista de espera, guardamos solo tu email para avisarte cuando MyWallet esté disponible en Google Play. No lo usamos para nada más, y puedes pedir que lo borremos en cualquier momento escribiendo a ${CONTACT}.`,
        'El email se guarda con un proveedor de envío de correos que actúa en nuestro nombre: Resend (resend.com). El sitio no usa cookies de rastreo ni analíticas.',
      ],
    },
    {
      h: '6. Menores de edad',
      p: ['MyWallet no está dirigida a menores de 13 años y no recopilamos a sabiendas datos de menores.'],
    },
    {
      h: '7. Cambios a esta política',
      p: ['Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha de actualización.'],
    },
    { h: '8. Contacto', p: [`Desarrollador de MyWallet · ${CONTACT}`] },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'Last updated: September 2026',
  intro: [
    'MyWallet is a 100% local personal-finance app: every transaction, budget and goal is stored only on your phone. There is no server of ours, no account, no cloud sync. This policy also covers what happens to your email if you join this site’s waitlist.',
  ],
  sections: [
    {
      h: '1. What you save in the app stays on your phone',
      p: [
        'Amounts, descriptions, categories, dates, payment methods, budgets, savings goals and debts are stored in a local database (SQLite) on your device. You don’t need an account, and the app never sends that content to any server of ours.',
        'If you uninstall the app, that content is permanently deleted. You can export a manual CSV backup from Settings beforehand.',
      ],
    },
    {
      h: '2. Permissions the app asks for, and why',
      list: [
        'Notification access: to detect bank transactions by reading notifications from the bank apps you choose in Settings. Processing happens entirely on your device; only the amount and a short description are extracted, never the full notification text, and notifications from other apps (messaging, social media, etc.) are never read.',
        'Microphone: to transcribe a dictated expense in real time. It only activates while you use that feature; the app never records or stores audio in any form.',
        'Storage (Android 12 or earlier): only to save the CSV file when you manually export your history from Settings.',
      ],
      p: ['You can deny or revoke any of these permissions in your phone’s settings; only the feature that needs it will stop working.'],
    },
    {
      h: '3. No analytics, no ads, no tracking',
      p: [
        'The app includes no third-party analytics, advertising or tracking, does not access contacts, camera, GPS location or SMS, and we do not sell or share data with anyone.',
      ],
    },
    {
      h: '4. No cloud backup',
      p: [
        'MyWallet’s database is explicitly excluded from Android’s automatic backup system: your financial data is never uploaded to Google Drive or any other automatic backup. Without a prior manual (CSV) backup, uninstalling the app erases your data for good.',
      ],
    },
    {
      h: '5. This website and the waitlist',
      p: [
        `If you join the waitlist, we store only your email to let you know when MyWallet is available on Google Play. We use it for nothing else, and you can ask us to delete it at any time by writing to ${CONTACT}.`,
        'Your email is stored with an email provider acting on our behalf: Resend (resend.com). The site uses no tracking cookies or analytics.',
      ],
    },
    {
      h: '6. Children',
      p: ['MyWallet is not directed at children under 13, and we do not knowingly collect data from children.'],
    },
    {
      h: '7. Changes to this policy',
      p: ['If we change this policy, we will post the new version here with its update date.'],
    },
    { h: '8. Contact', p: [`MyWallet developer · ${CONTACT}`] },
  ],
};

export const legalDocs: Record<'privacy', Record<Locale, LegalDoc>> = {
  privacy: { es: privacyEs, en: privacyEn },
};
