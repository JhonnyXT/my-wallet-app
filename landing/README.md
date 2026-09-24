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
- **Lista de espera** (en lugar de descarga, hasta que la app esté en Google
  Play): `POST /api/waitlist` → `src/lib/waitlist.ts` → crea un contacto en
  **Resend**, portado de Meld. Comparte cuenta/audiencia con
  `meld-app/landing`, separado por **segmento** (`MyWallet — Waitlist`,
  agrupa a quien se anota aquí) y **topic** (`MyWallet — Lanzamiento`,
  suscripción propia): dar de baja hace `opt_out` de ese topic únicamente
  (`PATCH /contacts/{email}/topics`), nunca el `unsubscribed` global del
  contacto — eso sacaría a la persona también de la lista de Meld si
  comparte el mismo email. IDs por defecto ya en el código (creados a mano
  en el dashboard, 2026-09-24); `RESEND_SEGMENT_ID`/`RESEND_TOPIC_ID` en
  `.env.example` solo hacen falta si se recrean. `RESEND_API_KEY` es
  obligatoria (puede ser la misma key que usa Meld, con permiso de
  contactos). Sin la key: en `next dev` solo loguea el email; en producción
  responde 503 (nunca finge que guardó). Campo trampa `website` contra
  bots. Baja: `GET /api/unsubscribe?email=…&lang=es` → página
  `/[lang]/unsubscribed` (para el link del futuro email de lanzamiento).
- **Enlaces externos**: `src/lib/links.ts` (repo, issues, política de privacidad).
- **Política de privacidad**: el sitio enlaza a
  `https://jhonnyxt.github.io/my-wallet-app/privacy-policy.html`
  (`docs/privacy-policy.html`, GitHub Pages). Esa URL está registrada en Play
  Console: no moverla.
- **Secciones**: `src/components/sections/*`, en el orden de
  `src/app/[lang]/page.tsx`.
- **Pantallas reales**: el carrusel (`Pantallas.tsx`) muestra marcadores hasta
  tener capturas. Sacarlas del variant `test` con datos de ejemplo, nunca del
  teléfono con datos reales, y usar un nombre de archivo nuevo al reemplazar una
  (`next/image` cachea por URL).

## Despliegue

Proyecto **`mywallet`** en Vercel (cuenta `jonathanblandon1017-5123`), `Root
Directory` = `landing`. Público en **https://mywallet-blush.vercel.app**
(`mywallet.vercel.app` a secas ya lo tiene otra cuenta — los subdominios
`.vercel.app` son globales, no por cuenta). `RESEND_API_KEY` y
`NEXT_PUBLIC_SITE_URL` ya configuradas en Production/Preview/Development
(2026-09-24).

**El repo de GitHub todavía NO está conectado** — el deploy de arriba se hizo
a mano con `vercel deploy --prod` desde `landing/`. Conectar el repo requiere
autorizar la GitHub App de Vercel desde el navegador (no se puede por CLI):
[Settings → Git](https://vercel.com/jonathanblandon1017-5123s-projects/mywallet/settings/git)
→ Connect Git Repository → `JhonnyXT/my-wallet-app` (confirmar que el `Root
Directory` quede en `landing`). Hasta que se conecte, un push a `master` NO
actualiza el sitio — hay que repetir `vercel deploy --prod` a mano.

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
- La política de privacidad no cubre todavía los emails de la lista de espera.
- Imagen Open Graph propia (hoy usa el ícono).
- Dominio propio (opcional — hoy la URL pública es `mywallet-blush.vercel.app`).

## Gotcha: animaciones con `@keyframes`

Tailwind v4 elimina del CSS final los `@keyframes` declarados dentro de
`@theme` que ninguna clase suya usa. Si una animación se usa desde un estilo en
línea (`style={{ animation: … }}`), su `@keyframes` va FUERA de `@theme`, en
`globals.css` normal.
