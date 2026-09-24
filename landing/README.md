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
- **Contenido "de la app"** (teléfono, filas del historial, notificaciones,
  frases de voz): `src/content/app.ts`. No se traduce, porque la app solo existe
  en español y en COP; la versión en inglés lo aclara. Los datos salen de la
  app real: colores de `categoryPresets.ts`, bancos de `banks.ts`, frases de voz
  verificadas contra `voiceParser.ts` y notificaciones de
  `notificationParser/fixtures.ts` pasadas por el pipeline real. Si el parser
  cambia, volver a verificarlas.
- **Lista de espera** (en lugar de descarga, hasta que la app esté en Google
  Play): `POST /api/waitlist` → `src/lib/waitlist.ts` → crea un contacto en
  **Resend** (`POST https://api.resend.com/contacts`), portado de Meld.
  Variables: `RESEND_API_KEY` (obligatoria) y `RESEND_SEGMENT_ID` (opcional),
  ver `.env.example`. Sin la key: en `next dev` solo loguea el email; en
  producción responde 503 (nunca finge que guardó). Campo trampa `website`
  contra bots. Baja: `GET /api/unsubscribe?email=…&lang=es` → página
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

## Estado

Fase 1 (hecha): diseño completo, estático, en español e inglés.

Pendiente:
- Fase 2: el teléfono de la portada interactivo (hoy es una réplica estática
  del Dashboard, `PhoneMock.tsx`).
- Capturas reales para el carrusel.
- Despliegue en Vercel (proyecto nuevo, `Root Directory` = `landing`),
  `NEXT_PUBLIC_SITE_URL` y `RESEND_API_KEY`.
- La política de privacidad no cubre todavía los emails de la lista de espera.
- Imagen Open Graph propia (hoy usa el ícono).

## Gotcha: animaciones con `@keyframes`

Tailwind v4 elimina del CSS final los `@keyframes` declarados dentro de
`@theme` que ninguna clase suya usa. Si una animación se usa desde un estilo en
línea (`style={{ animation: … }}`), su `@keyframes` va FUERA de `@theme`, en
`globals.css` normal.
