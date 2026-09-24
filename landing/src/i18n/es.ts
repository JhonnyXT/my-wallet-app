// Textos del sitio. El tipo `Dictionary` sale de este objeto: `en.ts` tiene
// que tener exactamente las mismas claves. Lo que se ve "dentro de la app"
// (teléfono, filas, notificaciones, frases de voz) NO va acá: vive en
// `src/content/app.ts` y no se traduce, porque la app solo existe en español.

export const es = {
  meta: {
    title: 'MyWallet — tus finanzas, claras y en tu teléfono',
    description:
      'Anota gastos e ingresos a mano, por voz o desde las notificaciones de tu banco. Presupuestos, metas y deudas. Gratis, sin cuentas y 100% en tu teléfono.',
  },
  nav: {
    language: 'Idioma',
  },
  waitlist: {
    label: 'Avísame cuando MyWallet llegue a Google Play',
    placeholder: 'tu@email.com',
    submit: 'Avísame',
    sending: 'Enviando…',
    success: '¡Listo, estás en la lista!',
    successDetail: 'Te escribiremos a {email} el día que MyWallet esté en Google Play. Nada más.',
    onList: 'Estás en la lista',
    change: 'Cambiar',
    invalid: 'Revisa tu email, parece que falta algo.',
    error: 'No pudimos guardar tu email. Inténtalo de nuevo en un momento.',
  },
  unsubscribe: {
    okTitle: 'Listo, te diste de baja',
    okBody: 'No te volveremos a escribir sobre el lanzamiento de MyWallet.',
    errorTitle: 'No pudimos darte de baja',
    errorBody: 'Algo falló al procesar el enlace. Inténtalo de nuevo más tarde.',
    backHome: 'Volver al inicio',
  },
  hero: {
    iconAlt: 'Ícono de MyWallet',
    title1: 'Tu plata, clara.',
    title2: 'Y solo en tu teléfono.',
    subtitle:
      'Anota cada gasto en segundos: a mano, dictándolo o dejando que MyWallet lo lea de la notificación de tu banco. Sin cuentas, sin nube, sin anuncios.',
    finePrint: 'Próximamente en Google Play · Gratis · Solo un email, nada de spam',
    privacyLink: 'Así cuidamos tus datos',
    widgetsNote: 'presupuesto por categoría',
    goalsNote: 'y tus metas, al día',
    phoneHint: 'la pantalla de inicio, tal cual',
  },
  registro: {
    titleA: 'Cinco formas de anotar,',
    titleB: 'una sola lista',
    subtitle: 'Elige la que te quede más a mano en cada momento. Todo termina en el mismo historial, editable con un deslizamiento.',
    bankNote: 'se detecta solo, tú solo confirmas',
    items: {
      manual: { title: 'A mano', desc: 'Monto, categoría, cuenta y fecha en una sola tarjeta, sin menús escondidos.' },
      voice: { title: 'Por voz', desc: 'Dilo como lo dirías: “gasté 45 mil en almuerzo hoy”. MyWallet saca el monto, el tipo y la categoría.' },
      batch: { title: 'Varios de una vez', desc: 'Dicta varios gastos en una frase y revísalos todos juntos antes de guardar.' },
      quick: { title: 'Escribiendo rápido', desc: 'Escribe “Uber 15000” en la entrada rápida y la categoría se adivina mientras tecleas.' },
      bank: { title: 'Desde tu banco', desc: 'Lee las notificaciones de tu banco en el teléfono y te propone el movimiento, listo para confirmar.' },
    },
  },
  voz: {
    eyebrow: 'Por voz',
    title: 'Dilo, y queda anotado.',
    subtitle: 'Habla como hablas: en números o en palabras, uno o varios movimientos. El reconocimiento de voz es el de tu teléfono, y la interpretación ocurre en la app.',
    bullets: [
      'Entiende “45 mil”, “dos millones 400 mil” o “89.900”',
      'Distingue gasto de ingreso por cómo lo dices',
      'Elige la categoría con tus propias palabras clave',
      'Varios movimientos en una frase, revisados antes de guardar',
    ],
    understood: 'MyWallet entendió',
    expense: 'Gasto',
    income: 'Ingreso',
    today: 'Hoy',
    movements: 'movimientos',
  },
  bancos: {
    titleA: 'Tu banco avisa,',
    chip: 'MyWallet',
    titleB: 'anota',
    subtitle:
      'Cuando llega la notificación de una compra o una transferencia, MyWallet la lee en tu teléfono y te propone el movimiento. Nunca guarda nada sin que lo confirmes.',
    detected: 'Detectado',
    ignored: 'Ignorado: es un recordatorio, no un pago',
    listTitle: 'Bancos y billeteras que reconoce',
    listNote: 'Tú eliges de cuáles leer. Códigos, alertas de seguridad y publicidad se descartan antes de tocar tus datos.',
  },
  promedios: {
    titleA: '¿En qué se te va',
    titleB: 'la plata?',
    subtitle: 'La gráfica del mes te muestra dónde gastaste; Promedios te dice cuánto gastas normalmente en cada cosa, con todo tu historial.',
    chartTitle: 'Gastos de septiembre',
    chartHint: 'toca una columna para filtrar',
    avgTitle: 'Promedio mensual',
    perMonth: '/mes',
    trendTitle: 'Tendencia',
    trendRange: 'Últimos 6 meses',
  },
  control: {
    title: 'Presupuestos, metas y deudas',
    subtitle: 'Pon un tope por categoría, ahorra para algo concreto y lleva la cuenta de lo que debes. Te avisa al llegar al 80% (o al porcentaje que elijas).',
    budget: { title: 'Presupuesto por categoría', over: 'excedido', of: 'de' },
    goal: { title: 'Meta de ahorro', saved: 'ahorrado', of: 'de' },
    debt: { title: 'Deuda', remaining: 'pendiente', monthly: 'cuota mensual', due: 'Recordatorio el día' },
  },
  detalles: {
    title: 'Los detalles',
    items: {
      offline: { t: 'Funciona sin internet', d: 'Todo vive en una base de datos dentro de tu teléfono. No hay servidor.' },
      cop: { t: 'Pesos colombianos', d: 'Montos con separador de miles, sin decimales, como los escribes.' },
      categories: { t: 'Tus categorías', d: '24 predefinidas para empezar, y las tuyas con emoji, color y palabras clave.' },
      accounts: { t: 'Cuentas y medios de pago', d: 'Efectivo, ahorros, tarjeta o los que quieras crear.' },
      search: { t: 'Búsqueda y filtros', d: 'Por texto, categoría, #tag, tipo o período.' },
      swipe: { t: 'Editar deslizando', d: 'Desliza a la derecha para editar, a la izquierda para borrar.' },
      alerts: { t: 'Alertas útiles', d: 'Presupuesto al límite, meta cumplida, cuota por pagar. Sin spam.' },
      export: { t: 'Exporta a CSV', d: 'Todos tus movimientos, para compartir o abrir en una hoja de cálculo.' },
      theme: { t: 'Claro y oscuro', d: 'Sigue el tema de tu teléfono o elígelo tú.' },
    },
  },
  pantallas: {
    title: 'Míralo en tu teléfono',
    subtitle: 'Pantallas reales de MyWallet.',
    soon: 'Captura en camino',
    prev: 'Pantalla anterior',
    next: 'Pantalla siguiente',
    goTo: 'Ir a la pantalla',
    items: [
      { a: 'Tu balance', b: 'de un vistazo', alt: 'Pantalla de inicio de MyWallet' },
      { a: 'Anota', b: 'en segundos', alt: 'Formulario de nuevo gasto' },
      { a: 'Revisa lo', b: 'que detectó', alt: 'Revisión de movimientos detectados del banco' },
      { a: 'Tus promedios', b: 'por categoría', alt: 'Pantalla de promedios' },
    ],
  },
  privacidad: {
    title: 'Gratis y privada.',
    titleB: 'Sin letra pequeña.',
    subtitle: 'No hay planes de pago, ni cuentas, ni publicidad. Tus finanzas no son un producto.',
    free: {
      name: 'MyWallet',
      price: '$0',
      per: 'Para siempre, todas las funciones',
      items: ['Registro manual, por voz y desde tu banco', 'Presupuestos, metas y deudas', 'Promedios y tendencia', 'Exportar a CSV', 'Sin anuncios'],
    },
    data: {
      name: 'Tus datos',
      tag: 'En tu teléfono',
      items: {
        local: { t: 'Tus movimientos no salen del teléfono', d: 'Sin servidor propio, sin sincronización, sin analíticas.' },
        noAccount: { t: 'Sin cuenta', d: 'Abres la app y empiezas. No pide correo ni contraseña.' },
        noNumbers: { t: 'Sin números de cuenta', d: 'Nunca guarda números de tarjeta ni de cuenta bancaria.' },
        noBackup: { t: 'Sin copia en la nube', d: 'El respaldo automático de Android está desactivado para esta app.' },
        yourBanks: { t: 'Solo los bancos que elijas', d: 'La lectura de notificaciones se activa y se limita desde Ajustes.' },
      },
    },
  },
  cta: {
    titleA: 'Sé de los primeros.',
    titleB: 'Te avisamos el día del lanzamiento.',
    note: 'Para Android 8 o superior. Solo usamos tu email para avisarte del lanzamiento.',
  },
  footer: {
    privacy: 'Política de privacidad',
    source: 'Código en GitHub',
    support: 'Soporte',
    rights: '© 2026 MyWallet',
  },
};

export type Dictionary = typeof es;
