# MyWallet — landing

Landing page de MyWallet (Next.js 16, App Router, Tailwind v4), con el mismo
diseño y estructura que la de Meld (`../../meld-app/landing`). Proyecto npm
aparte de la app de Expo: tiene su propio `package.json`/`node_modules`, y la
raíz lo ignora (`tsconfig.json`, `metro.config.js`, `eslint.config.js`,
`jest.config.js`, `.prettierignore`).

```bash
cd landing
npm install
npm run dev          # http://localhost:3000 → redirige a /es o /en
npm run build && npm start
npm run lint
```

- **Idiomas**: los textos del sitio viven en `src/i18n/es.ts` (el tipo sale de
  ahí) y `src/i18n/en.ts`. `src/proxy.ts` redirige `/` al idioma del navegador;
  solo existen `/es` y `/en` (páginas estáticas).
- **Demo interactiva (portada)**: `src/demo/`. El teléfono (`DemoPhone.tsx`)
  es MyWallet con datos de ejemplo, y cada pantalla de `src/demo/phone/` es una
  réplica de la app en tema oscuro con sus medidas, colores y textos exactos
  (el dashboard de `app/(tabs)/index.tsx`, `CategoryChart`, `TransactionItem`,
  `FloatingDock`, `active-expense.tsx`, `voice-input.tsx`,
  `voice-batch-review.tsx`, `notification-review.tsx` y `reports.tsx`). Se
  renderiza a 400 px de ancho lógico y se escala al marco, así los valores de
  los `StyleSheet` se copian tal cual; si cambia el diseño de esas pantallas en
  la app, actualizar la réplica. Solo funcionan las 4 funciones de la demo
  (anotar a mano, dictar, aviso del banco y Promedios) más lo mínimo del
  dashboard: píldoras gasto/ingreso, tap en una columna para filtrar (se quita
  con atrás o deslizando la lista hacia abajo) y deslizar una fila a la
  izquierda para borrarla. El resto (período, búsqueda, ajustes, editar,
  detalle, popup de la gráfica, crear categoría…) se muestra pero no responde.
  La barra de navegación de Android (atrás / inicio) sí funciona. A la izquierda
  `Narrator.tsx` narra lo que acaba de pasar (y, con la pantalla de voz
  abierta, deja escribir o elegir la frase a "dictar"); a la derecha los
  presupuestos y totales en vivo. Un solo estado (`useDemo.ts`, reducer), solo
  en memoria: al recargar vuelve a `SEED` (`data.ts`: septiembre más el
  historial de abril a agosto, del que salen Promedios y Tendencia; "hoy" fijo
  en el 24 de septiembre de 2026).
- **Lógica real de la app en la demo**: `src/demo/app/` es una COPIA GENERADA
  de `src/utils/voiceParser.ts`, `src/utils/fuzzyMatch.ts` y
  `src/constants/categoryPresets.ts` de la app. No editarla a mano: si cambia
  el original, correr `npm run sync:app` (`scripts/sync-app-logic.sh`). Así la
  demo entiende las frases exactamente igual que la app, bugs incluidos.
- **Contenido "de la app" (teléfono, filas del historial, notificaciones,
  frases de voz): `src/content/app.ts`. No se traduce, porque la app solo existe
  en español y en COP; la versión en inglés lo aclara. Los datos salen de la
  app real: colores de `categoryPresets.ts`, bancos de `banks.ts`, frases de voz
  verificadas contra `voiceParser.ts` y notificaciones de
  `notificationParser/fixtures.ts` pasadas por el pipeline real. Si el parser
  cambia, volver a verificarlas.
- **Lista de espera**: vive en **joblan** (`joblan/joblan-web`). Los botones
  (`src/components/WaitlistCta.tsx`) llevan a
  `joblanstudio.vercel.app/<idioma>?app=mywallet#avisame`, que llega con la app ya
  elegida y guarda en el mismo segmento (`MyWallet — Waitlist`) y topic
  (`MyWallet — Lanzamiento`) de Resend de siempre. Aquí solo queda la baja:
  `/api/unsubscribe` → `unsubscribeEmail` en `src/lib/waitlist.ts` (`opt_out`
  del topic, nunca la baja global, que sacaría a la persona también de
  Meld). `NEXT_PUBLIC_JOBLAN_URL` cambia la URL de joblan si hace falta.
- **Enlaces externos**: `src/lib/links.ts` (`PRIVACY_URL` de referencia,
  `SUPPORT_EMAIL`). El footer ya no enlaza al repo de GitHub ni a Issues
  (`Soporte` es un `mailto:` directo); si se necesita reportar algo en
  GitHub, es manual.
- **Política de privacidad**: DOS copias a propósito, no fusionar.
  `docs/privacy-policy.html` (GitHub Pages,
  `https://jhonnyxt.github.io/my-wallet-app/privacy-policy.html`) es la URL
  registrada en Play Console — no moverla ni depender de que el sitio nuevo
  la reemplace. El sitio en sí enlaza (footer y sección "Privacidad") a
  `/[lang]/privacy`, una página propia con el mismo patrón tipado que
  `meld-app/landing` (`src/legal/docs.ts` + `LegalPage.tsx`): título, fecha,
  intro y secciones con lista u párrafos, en español e inglés. Cubre además
  los emails de la lista de espera (Resend). Si cambia algo real (permisos,
  qué se sube a la nube, proveedor de la lista de espera, exportación),
  actualizar **ambos** documentos.
- **Eliminar cuenta** (`/[lang]/delete-account`, mismo `LegalPage` con
  `legalDocs.deleteAccount`): la URL web para pedir la eliminación que exige
  Google Play (`https://usemywallet.vercel.app/es/delete-account`). Explica
  cómo hacerlo en la app y, sin la app, un botón `mailto:` prellenado (desde el
  correo de la cuenta, así ya viene verificado quién lo pide; sin formulario ni
  API a propósito). Enlazada desde el footer y desde las dos políticas. Si cambia
  la URL del sitio, actualizarla en `docs/privacy-policy.html`, `README.md`,
  `DOCUMENTATION.md` y Play Console. Atender una solicitud: ver
  `PLAY_DATA_SAFETY.md` en la raíz.
- **Secciones**: `src/components/sections/*`, en el orden de
  `src/app/[lang]/page.tsx`.
- **Pantallas reales**: el carrusel (`Pantallas.tsx`) muestra marcadores hasta
  tener capturas. Sacarlas del variant `test` con datos de ejemplo, nunca del
  teléfono con datos reales, y usar un nombre de archivo nuevo al reemplazar una
  (`next/image` cachea por URL).

## Despliegue

Proyecto **`mywallet`** en Vercel (cuenta `jonathanblandon1017-5123`). Se
despliega desde `landing/` con la CLI, así que la raíz del deploy es esta carpeta. Público en **https://usemywallet.vercel.app** (antes `mywallet-blush.vercel.app`, que ya no responde: si cambia el dominio, actualizar `NEXT_PUBLIC_SITE_URL` y buscar la URL vieja en todo el repo, incluidas las políticas y `PLAY_DATA_SAFETY.md`)
(`mywallet.vercel.app` a secas ya lo tiene otra cuenta — los subdominios
`.vercel.app` son globales, no por cuenta). `RESEND_API_KEY` y
`NEXT_PUBLIC_SITE_URL` ya configuradas en Production/Preview/Development
(2026-09-24).

**El repo de GitHub está conectado, pero con `Root Directory` = `.`**
(visto el 2026-10-06): cada push a `master` dispara un deploy desde la raíz del
repo que falla ("No Next.js version detected"). Los fallidos no se publican, así
que el sitio sigue siendo el último `vercel deploy --prod` hecho a mano desde
`landing/`. Para el deploy automático hay que poner `Root Directory` = `landing`
en [Settings → Build and Deployment](https://vercel.com/jonathanblandon1017-5123s-projects/mywallet/settings)
(desde el navegador). Mientras tanto, después de cada push que toque `landing/`,
repetir `vercel deploy --prod`.

Si se compra un dominio propio, se agrega en Settings → Domains del mismo
proyecto y hay que actualizar `NEXT_PUBLIC_SITE_URL` (Vercel dashboard, las 3
environments) a la URL nueva.

## Estado

Fase 1 (hecha): diseño completo, en español e inglés, con lista de espera.
Fase 2 (hecha): portada con demo interactiva, narrador y datos en vivo.
Fase 3 (hecha): desplegada en Vercel (ver arriba).

Pendiente:
- Conectar el repo de GitHub en Vercel (deploy automático — ver arriba).
- Capturas reales para el carrusel.
- Imagen Open Graph propia (hoy usa el ícono).
- Dominio propio (opcional — hoy la URL pública es `usemywallet.vercel.app`).

## Gotcha: animaciones con `@keyframes`

Tailwind v4 elimina del CSS final los `@keyframes` declarados dentro de
`@theme` que ninguna clase suya usa. Si una animación se usa desde un estilo en
línea (`style={{ animation: … }}`), su `@keyframes` va FUERA de `@theme`, en
`globals.css` normal.
