// Texto de la Política de Privacidad para la landing (Next.js), en el mismo
// formato tipado que usa `meld-app/landing` (repo hermano) para su LegalPage.
//
// Esta es una SEGUNDA copia de la política, pensada para verse bien dentro de
// la landing nueva. La copia "oficial" ante Google Play sigue siendo
// `docs/privacy-policy.html` (GitHub Pages) — esa URL está registrada en Play
// Console y no se cambia (ver `AGENTS.md` § Landing page y GitHub Pages). Si
// cambia algo real (permisos, qué se sube a la nube, proveedor de la lista de
// espera, exportación), hay que actualizar AMBOS documentos.
//
// `deleteAccount` sí vive solo aquí: es la "URL para pedir la eliminación de la
// cuenta" que exige Google Play (`/[lang]/delete-account`).

import type { Locale } from '@/i18n/config';

export type LegalSection = { h: string; p?: string[]; list?: string[]; cta?: { label: string; href: string } };
export type LegalDoc = { title: string; updated: string; intro: string[]; sections: LegalSection[] };

const CONTACT = 'jonathanblandon1017@gmail.com';

const DELETE_URL = 'https://mywallet-blush.vercel.app/es/delete-account';

function mailto(subject: string, body: string): string {
  return `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const privacyEs: LegalDoc = {
  title: 'Política de privacidad',
  updated: 'Última actualización: octubre de 2026',
  intro: [
    'MyWallet funciona completa en tu teléfono, con o sin internet. Iniciar sesión con Google es opcional: si lo haces, guardamos una copia de tus datos en la nube de Google (Firebase) para que no los pierdas si cambias de celular y para que puedas compartir listas. Sin cuenta, tus datos no salen de tu teléfono. Esta política explica también qué pasa con tu email si te unes a la lista de espera de este sitio.',
  ],
  sections: [
    {
      h: '1. Lo que guardas en la app',
      p: [
        'Montos, descripciones, etiquetas, categorías, fechas, métodos de pago (solo un nombre, como “Ahorros”), presupuestos, metas de ahorro, deudas, tus listas y los nombres de las personas que agregas a ellas se guardan primero en una base de datos local (SQLite) dentro de tu dispositivo. MyWallet nunca guarda números de cuenta ni de tarjeta.',
      ],
    },
    {
      h: '2. Cuenta y respaldo en la nube (opcional)',
      list: [
        'Qué se sube: si inicias sesión con Google, una copia de lo anterior y tus preferencias (modo oscuro, alertas, bancos a detectar). De tu cuenta de Google: nombre, correo e identificador, gestionados por Firebase Authentication; nunca tu contraseña.',
        'Dónde: Google Firebase (Cloud Firestore y Authentication), en servidores de Google Cloud en Estados Unidos. Google actúa como proveedor de servicio y cifra los datos en tránsito y en reposo.',
        'Quién puede verlos: solo tú; las reglas de seguridad impiden que otra cuenta lea tu respaldo (salvo lo que pongas en una lista compartida).',
        'Para qué: solo para respaldar, restaurar y compartir listas. Nunca para publicidad, analíticas ni perfiles.',
        'Lo que no se sube: el texto de las notificaciones de tu banco, ni siquiera las pendientes por revisar (solo los movimientos que tú confirmas), ni audio.',
      ],
      p: ['Sin sesión iniciada, la app no se conecta a ningún servidor.'],
    },
    {
      h: '3. Listas compartidas',
      p: [
        'Puedes compartir una lista (por ejemplo, “Vacaciones”) con un código. Quienes se unen ven y pueden editar su nombre, ícono, categorías y la opción “mostrar ingresos”, las personas de la lista (al unirte se muestra tu primer nombre de Google) y sus movimientos con quién pagó cada uno. El período y los presupuestos son de cada persona. Tus otras listas nunca se comparten.',
        'Si sales de una lista compartida, los movimientos que registraste en ella siguen visibles para los demás, para que las cuentas entre ustedes sigan cuadrando.',
      ],
    },
    {
      h: '4. Permisos que pide la app y para qué',
      list: [
        'Acceso a notificaciones: para detectar transacciones bancarias leyendo notificaciones de las apps de banco que tú elijas en Ajustes. El procesamiento ocurre 100% en tu dispositivo; solo se extrae el monto y una descripción corta, nada se registra hasta que lo confirmas, y nunca se leen notificaciones de otras apps (mensajería, redes sociales, etc.).',
        'Micrófono: para transcribir un gasto dictado por voz. Se activa solo mientras usas esa función y la app no graba ni guarda audio. La transcripción la hace el reconocimiento de voz de Android, que según tu teléfono funciona en el dispositivo o en los servidores de Google, bajo la política de Google.',
        'Internet: solo para iniciar sesión y sincronizar tu respaldo y tus listas compartidas. La app funciona completa sin conexión y sube los cambios cuando vuelve.',
      ],
      p: ['Puedes negar o retirar cualquiera de estos permisos desde los ajustes de tu teléfono; solo deja de funcionar la función que lo necesita.'],
    },
    {
      h: '5. Sin analíticas, sin publicidad, sin rastreo',
      p: [
        'La app no incluye herramientas de analítica, publicidad ni rastreo de terceros, no accede a contactos, cámara, ubicación GPS ni SMS, y no vendemos ni compartimos datos con nadie.',
      ],
    },
    {
      h: '6. Retención y eliminación',
      list: [
        'Eliminar tu cuenta y tu respaldo: Ajustes → Cuenta → Eliminar cuenta. Borra tu cuenta, todo tu respaldo en la nube y las listas compartidas que creaste, y te saca de las de otras personas. Lo que tienes en el teléfono no se borra.',
        `Sin la app instalada: pídelo en ${DELETE_URL}.`,
        'Borrar del teléfono: Ajustes → Cuenta → Cerrar sesión → “Borrar de este teléfono”, Ajustes → Borrar historial, o desinstalar la app.',
        'Llevarte tus datos: Ajustes → Exportar CSV, por cada lista.',
      ],
      p: [
        'El respaldo automático de Android está desactivado para MyWallet: tus datos no se copian a Google Drive. Cuando borras un movimiento, su contenido (monto, descripción, categoría…) se borra también de la nube: solo queda una marca de que existió, para que tus otros teléfonos lo borren. Al eliminar tu cuenta desaparece todo, marcas incluidas.',
      ],
    },
    {
      h: '7. Este sitio web y la lista de espera',
      p: [
        `Si te unes a la lista de espera, guardamos solo tu email para avisarte cuando MyWallet esté disponible en Google Play. No lo usamos para nada más, y puedes pedir que lo borremos en cualquier momento escribiendo a ${CONTACT}.`,
        'El email se guarda con un proveedor de envío de correos que actúa en nuestro nombre: Resend (resend.com). El sitio no usa cookies de rastreo ni analíticas.',
      ],
    },
    {
      h: '8. Menores de edad',
      p: ['MyWallet no está dirigida a menores de 13 años y no recopilamos a sabiendas datos de menores.'],
    },
    {
      h: '9. Cambios a esta política',
      p: ['Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha de actualización.'],
    },
    { h: '10. Contacto', p: [`Desarrollador de MyWallet · ${CONTACT}`] },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'Last updated: October 2026',
  intro: [
    'MyWallet works fully on your phone, with or without internet. Signing in with Google is optional: if you do, we keep a copy of your data in Google’s cloud (Firebase) so you don’t lose it when you change phones and so you can share lists. Without an account, your data never leaves your phone. This policy also covers what happens to your email if you join this site’s waitlist.',
  ],
  sections: [
    {
      h: '1. What you save in the app',
      p: [
        'Amounts, descriptions, tags, categories, dates, payment methods (just a name, like “Savings”), budgets, savings goals, debts, your lists and the names of the people you add to them are stored first in a local database (SQLite) on your device. MyWallet never stores account or card numbers.',
      ],
    },
    {
      h: '2. Account and cloud backup (optional)',
      list: [
        'What is uploaded: if you sign in with Google, a copy of the above plus your preferences (dark mode, alerts, banks to detect). From your Google account: name, email and user ID, handled by Firebase Authentication; never your password.',
        'Where: Google Firebase (Cloud Firestore and Authentication), on Google Cloud servers in the United States. Google acts as a service provider and encrypts data in transit and at rest.',
        'Who can see it: only you; security rules prevent any other account from reading your backup (except what you put in a shared list).',
        'What for: only to back up, restore and share lists. Never for advertising, analytics or profiling.',
        'What is never uploaded: the text of your bank notifications, not even the ones waiting for review (only the transactions you confirm), and no audio.',
      ],
      p: ['Without signing in, the app doesn’t connect to any server.'],
    },
    {
      h: '3. Shared lists',
      p: [
        'You can share a list (say, “Vacation”) with a code. People who join can see and edit its name, icon, categories and the “show income” option, the people in the list (when you join, your Google first name is shown) and its transactions, including who paid each one. Period and budgets are personal to each person. Your other lists are never shared.',
        'If you leave a shared list, the transactions you recorded in it stay visible to the others, so the balances between you still add up.',
      ],
    },
    {
      h: '4. Permissions the app asks for, and why',
      list: [
        'Notification access: to detect bank transactions by reading notifications from the bank apps you choose in Settings. Processing happens entirely on your device; only the amount and a short description are extracted, nothing is recorded until you confirm it, and notifications from other apps (messaging, social media, etc.) are never read.',
        'Microphone: to transcribe a dictated expense. It only activates while you use that feature and the app never records or stores audio. Transcription is done by Android’s speech recognition, which depending on your phone runs on-device or on Google’s servers, under Google’s privacy policy.',
        'Internet: only to sign in and sync your backup and shared lists. The app works fully offline and uploads changes when the connection comes back.',
      ],
      p: ['You can deny or revoke any of these permissions in your phone’s settings; only the feature that needs it will stop working.'],
    },
    {
      h: '5. No analytics, no ads, no tracking',
      p: [
        'The app includes no third-party analytics, advertising or tracking, does not access contacts, camera, GPS location or SMS, and we do not sell or share data with anyone.',
      ],
    },
    {
      h: '6. Retention and deletion',
      list: [
        'Delete your account and backup: Ajustes (Settings) → Cuenta → “Eliminar cuenta”. It deletes your account, your whole cloud backup and the shared lists you created, and removes you from other people’s lists. What’s on your phone is not deleted.',
        `Without the app installed: request it at ${DELETE_URL.replace('/es/', '/en/')}.`,
        'Delete from the phone: Ajustes → Cuenta → “Cerrar sesión” → “Borrar de este teléfono”, Ajustes → “Borrar historial”, or uninstall the app.',
        'Take your data with you: Ajustes → “Exportar CSV”, per list.',
      ],
      p: [
        'Android’s automatic backup is disabled for MyWallet: your data is never copied to Google Drive. When you delete a transaction, its content (amount, description, category…) is deleted from the cloud too: only a marker that it existed remains, so your other phones delete it as well. Deleting your account removes everything, markers included.',
      ],
    },
    {
      h: '7. This website and the waitlist',
      p: [
        `If you join the waitlist, we store only your email to let you know when MyWallet is available on Google Play. We use it for nothing else, and you can ask us to delete it at any time by writing to ${CONTACT}.`,
        'Your email is stored with an email provider acting on our behalf: Resend (resend.com). The site uses no tracking cookies or analytics.',
      ],
    },
    {
      h: '8. Children',
      p: ['MyWallet is not directed at children under 13, and we do not knowingly collect data from children.'],
    },
    {
      h: '9. Changes to this policy',
      p: ['If we change this policy, we will post the new version here with its update date.'],
    },
    { h: '10. Contact', p: [`MyWallet developer · ${CONTACT}`] },
  ],
};

const deleteAccountEs: LegalDoc = {
  title: 'Eliminar tu cuenta de MyWallet',
  updated: 'Última actualización: octubre de 2026',
  intro: [
    'Tener cuenta en MyWallet es opcional: solo existe si iniciaste sesión con Google para respaldar tus datos o compartir listas. Aquí puedes eliminarla junto con todo lo que guardamos en la nube.',
  ],
  sections: [
    {
      h: 'Desde la app (inmediato)',
      list: [
        'Abre MyWallet y entra a Ajustes.',
        'En la sección Cuenta, toca “Eliminar cuenta”.',
        'Confirma. Si iniciaste sesión hace un rato, la app te pedirá elegir tu cuenta de Google otra vez.',
      ],
    },
    {
      h: 'Sin la app instalada',
      p: [
        'Escríbenos desde el correo de la cuenta de Google con la que iniciaste sesión, para que podamos confirmar que es tuya. Eliminamos la cuenta y todos sus datos en un plazo máximo de 30 días y te avisamos cuando esté hecho.',
      ],
      cta: {
        label: 'Pedir la eliminación por correo',
        href: mailto(
          'Eliminar mi cuenta de MyWallet',
          'Hola, quiero eliminar mi cuenta de MyWallet y todos sus datos en la nube. Te escribo desde el correo de la cuenta de Google con la que inicié sesión.',
        ),
      },
    },
    {
      h: 'Qué se elimina',
      list: [
        'Tu cuenta (nombre, correo e identificador de Google en Firebase Authentication).',
        'Todo tu respaldo en la nube: movimientos, listas, categorías, presupuestos, pago y período, métodos de pago, metas, deudas y preferencias.',
        'Las listas compartidas que creaste, para todas las personas que estaban en ellas.',
      ],
    },
    {
      h: 'Qué se conserva',
      list: [
        'En las listas compartidas de otras personas, los movimientos que registraste y tu nombre (marcado como que saliste) se quedan, para que las cuentas entre ellos sigan cuadrando.',
        'Lo que está en tu teléfono no se borra al eliminar la cuenta. Para borrarlo, usa Ajustes → Borrar historial o desinstala la app.',
        'No guardamos copias de seguridad aparte: lo eliminado no se puede recuperar.',
      ],
    },
    { h: 'Contacto', p: [`Desarrollador de MyWallet · ${CONTACT}`] },
  ],
};

const deleteAccountEn: LegalDoc = {
  title: 'Delete your MyWallet account',
  updated: 'Last updated: October 2026',
  intro: [
    'A MyWallet account is optional: it only exists if you signed in with Google to back up your data or share lists. Here you can delete it along with everything we store in the cloud.',
  ],
  sections: [
    {
      h: 'From the app (immediate)',
      list: [
        'Open MyWallet and go to Ajustes (Settings; the app is in Spanish).',
        'In the Cuenta (Account) section, tap “Eliminar cuenta”.',
        'Confirm. If you signed in a while ago, the app will ask you to pick your Google account again.',
      ],
    },
    {
      h: 'Without the app installed',
      p: [
        'Email us from the address of the Google account you signed in with, so we can confirm it’s yours. We delete the account and all its data within 30 days and let you know when it’s done.',
      ],
      cta: {
        label: 'Request deletion by email',
        href: mailto(
          'Delete my MyWallet account',
          'Hi, I want to delete my MyWallet account and all its cloud data. I’m writing from the email of the Google account I signed in with.',
        ),
      },
    },
    {
      h: 'What gets deleted',
      list: [
        'Your account (Google name, email and user ID in Firebase Authentication).',
        'Your whole cloud backup: transactions, lists, categories, budgets, pay and period, payment methods, goals, debts and preferences.',
        'The shared lists you created, for everyone who was in them.',
      ],
    },
    {
      h: 'What is kept',
      list: [
        'In other people’s shared lists, the transactions you recorded and your name (marked as having left) stay, so the balances between them still add up.',
        'What’s on your phone is not deleted with the account. To erase it, use Ajustes → “Borrar historial” or uninstall the app.',
        'We keep no separate backups: deleted data cannot be recovered.',
      ],
    },
    { h: 'Contact', p: [`MyWallet developer · ${CONTACT}`] },
  ],
};

export const legalDocs: Record<'privacy' | 'deleteAccount', Record<Locale, LegalDoc>> = {
  privacy: { es: privacyEs, en: privacyEn },
  deleteAccount: { es: deleteAccountEs, en: deleteAccountEn },
};
