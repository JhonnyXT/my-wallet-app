# AGENTS.md — MyWallet

Aplicación personal de control financiero para Android. 100% offline, datos en SQLite + AsyncStorage, moneda COP, UI en español. Principio de diseño: "Minimalismo Funcional" inspirado en Google Stitch.

---

## Setup y arranque

### Requisitos previos
- Node.js >= 20
- Android SDK (compileSdk, targetSdk según expo defaults para SDK 55)
- Java 17 (para Gradle)
- ADB en PATH: `C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe`

### Instalación
```bash
npm install
```
Conflictos de peer deps (React 19 vs. librerías con peer React 18, ej.
`react-native-android-notification-listener@5.0.1`) ya no requieren el flag a mano — `.npmrc`
en la raíz fija `legacy-peer-deps=true` para todo install, `npm install` y `npm ci` incluidos.
No borrar ese archivo: EAS Build (ver Build variants más abajo) corre `npm ci --include=dev`
sin flags propias, y sin el `.npmrc` falla en "Install dependencies" con `ERESOLVE`.

### Arrancar en desarrollo
```bash
npm start                # Metro bundler, variant dev (escanea QR o presiona 'a' para Android)
npm run android          # Build + ejecución directa en dispositivo/emulador, variant dev
```

### Build variants: dev / test / prod

Patrón portado de `habit-tracker` (mismo repo hermano). Config dinámica en `app.config.ts` (ya
no `app.json` estático) — una tabla `variants` define `name`/`package`/`scheme`/`iconBackground`
por variant, seleccionado con la env var `APP_VARIANT` (`dev` por defecto si no se define). Un
`APP_VARIANT` desconocido **lanza excepción** al resolver la config, no hay fallback silencioso.

| Variant | `applicationId` | Para qué | Cómo se construye |
|---|---|---|---|
| `dev` | `com.mywallet.app` (el original — conserva los datos ya instalados) | Iterar día a día | Local, `npm run build:dev` (`assembleDebug`) |
| `test` | `com.mywallet.app.test` | Probar un build "limpio" sin Metro, DB vacía | Local, `npm run build:test` (`assembleRelease`) |
| `prod` | `com.mywallet` | La versión que se distribuye (GitHub Releases) | Solo EAS, `npm run eas:prod` — nunca local |

Los tres se instalan **uno al lado del otro** en el mismo dispositivo (`applicationId` distinto =
apps distintas para Android, cada una con su propia base de datos SQLite). El código de la app
lee el variant desde `src/constants/appVariant.ts` (`appVariant`/`isDev`/`isTest`/`isProd`),
nunca desde `process.env` directo (esa env var solo existe en el proceso de build de Node, no en
runtime de la app).

```bash
npm run build:dev     # prebuild (incremental si no cambió el variant) + assembleDebug + adb install
npm run build:test    # ídem con assembleRelease
npm run eas:prod       # AAB/APK firmado con credenciales gestionadas por EAS, en la nube
```

`scripts/build-android.sh` (usado por `build:dev`/`build:test`) recuerda el último variant
construido en `android/.last-variant` — solo fuerza `prebuild --clean` cuando el variant cambió
(cambiar de variant obliga a un rebuild nativo completo porque el `applicationId` queda horneado
en el proyecto nativo generado); reconstruir el mismo variant corre un `prebuild` incremental para
no perder las cachés de Gradle/CMake. Si hay un dispositivo conectado (`adb get-state` responde),
instala automáticamente; si no, deja el APK listo en `android/app/build/outputs/apk/...` para
transferirlo manualmente (sin necesidad de mantener el cable/depuración USB activos).

`prod` se rechaza explícitamente en local (`scripts/build-android.sh prod` sale con error): un
`assembleRelease` local firmaría con la debug keystore y dispararía el bloqueo de Google Play
Protect — el mismo problema que documenta la deuda técnica "Sin keystore de producción" más abajo.
`eas build --profile prod` resuelve esto de raíz: EAS genera y gestiona una keystore de producción
real por su cuenta (nunca se toca `keytool` a mano). Requiere `eas login` con la cuenta de Expo del
proyecto (`owner: "jhonnyxt"` en `app.config.ts`) y consume cuota de build de esa cuenta — **no
ejecutar sin que el usuario lo pida explícitamente**, es la última pieza del proceso de release
(ver también el proceso manual de subir el APK a GitHub Releases, sección Landing page más abajo).

### Build local directo (sin variants, referencia)
```bash
cd android
.\gradlew assembleRelease
```
APK en: `android/app/build/outputs/apk/release/app-release.apk`

Instalar vía ADB (PowerShell):
```powershell
$adb = "C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```
Sin `APP_VARIANT` definida, resuelve al variant `dev` (mismo `applicationId` de siempre,
`com.mywallet.app`) — este flujo directo con Gradle sigue funcionando exactamente igual que antes
de los build variants, es lo que usan los workflows `/arrancar`/`/build-apk`/`/dev` existentes.

### Tests
```bash
npm test              # corre toda la suite (Jest)
npm test -- <patrón>  # ej. npm test -- formatMoney
```
Cobertura hoy: utilidades puras y parsing, con tests co-locados (`*.test.ts`): los fixtures de `notificationParser/fixtures.ts` (uno por `it()`), `formatMoney`, `periodFilter`, `colorUtils`, `transactionFormatters`, `voiceParser`, `nlp`, `descriptionExtractor` y `theme` (`guessCategoryEmoji`). Componentes `.tsx`, stores y `src/db/` (SQLite) todavía no tienen estrategia de testing — ver Deuda técnica. Si un test importa (aunque sea transitivamente) algo de `src/db/`, mockear solo la función puntual usada, como hace `parseNotification.test.ts` con `localISOString`, para no arrastrar `expo-sqlite`.

### Lint
```bash
npm run lint          # ESLint (eslint.config.js, flat config)
npm run lint:fix       # con --fix
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```
Config: `eslint-config-expo@~55.0.1` (flat config, pineado a SDK 55), con `react/no-unescaped-entities` desactivada (regla de React DOM sin sentido en RN). `.prettierignore` excluye `*.md`/`*.mdc` (docs mantenidas a mano, Prettier rompe el padding de tablas) y `docs/` (landing con CSS compacto hecho a mano) — Prettier es solo para código JS/TS/JSON de `app/`/`src/`/configs de raíz.

---

## Sistema de agentes IA

Este repo trae un sistema de agentes compartido entre Claude Code y Cursor (commands, subagentes,
skills, reglas y flujo SDD). Su documentación completa —onboarding, mapa de archivos y cómo
extenderlo— vive en **[`.agents/README.md`](.agents/README.md)**, fuera del contexto auto-cargado.

Léelo solo si vas a tocar el tooling. Para trabajar en la app no hace falta: cada herramienta
descubre sus comandos, subagentes y skills automáticamente de sus carpetas.

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Lenguaje | TypeScript (strict: true) | ~5.9.2 |
| Framework | React Native + Expo | 0.83.2 / SDK 55 |
| Bundler | Metro (Expo) | Default Expo 55 |
| Estilos | NativeWind (Tailwind) + StyleSheet.create | ^4.2.2 |
| Componentes UI | Propios (`src/components/ui/`) + lucide-react-native | ^0.576.0 |
| Routing | Expo Router (file-based, Stack + Tabs) | ~55.0.3 |
| Estado | Zustand (6 stores, 2 persistidos con AsyncStorage) | ^5.0.11 |
| HTTP/Fetch | N/A (100% offline) | — |
| Base de datos | expo-sqlite (WAL mode) | ^55.0.10 |
| ORM | Sin ORM (SQL directo con placeholders) | — |
| Auth | N/A (app local, sin servidor) | — |
| Testing | Jest (utilidades puras y `notificationParser`; componentes/stores/`src/db/` fuera de alcance) | ^30.4.2 |
| Lint / Format | ESLint (`eslint-config-expo`, flat config) + Prettier (`.md`/`.mdc`/`docs/` excluidos vía `.prettierignore`) | ^9.39.5 / ^3.9.6 |
| Package manager | npm | — |
| CI/CD | GitHub Actions (EAS Build/Update, workflow_dispatch) | — |
| Notificaciones push | react-native-android-notification-listener (HeadlessJS) + expo-notifications (canales locales) | ^5.0.1 |

---

## Clasificación del proyecto
**Frontend puro (mobile)** — App React Native/Expo sin backend. Toda la lógica y datos son locales.

---

## Estructura del proyecto

```
my-wallet-app/
├── app/                              # Rutas (Expo Router)
│   ├── _layout.tsx                   # Root: ThemeProvider, initDB, Stack, splash
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tabs ocultas + FloatingDock + FloatingInput
│   │   ├── index.tsx                 # Dashboard principal + badge notificaciones
│   │   ├── chat.tsx                  # Chat NLP (experimental)
│   │   └── wallet.tsx                # Placeholder (href: null)
│   ├── active-expense.tsx            # Modal: nuevo gasto/ingreso, también edición (?editId=)
│   ├── reports.tsx                   # Modal "Promedios": promedio mensual histórico por categoría + tendencia
│   ├── category-onboarding.tsx       # Onboarding paso 1: selección de categorías
│   ├── notification-onboarding.tsx   # Onboarding paso 2: explica la detección automática
│   ├── bank-selection-onboarding.tsx # Onboarding paso 3 (último): elegir bancos a rastrear
│   ├── notification-review.tsx       # Modal: revisión transacciones bancarias detectadas
│   ├── settings.tsx                  # Modal: configuración completa
│   ├── voice-input.tsx               # Modal: entrada por voz
│   └── voice-batch-review.tsx        # Modal: revisión lote multi-voz
│
├── src/
│   ├── components/ui/                # 20 componentes reutilizables (incl. BottomSheet, CalendarSheet, DateRangeSheet)
│   ├── components/chat/              # BoldText, WeeklySummaryCard, ChatMessageBubble, ChatHistoryDrawer, chatConstants
│   ├── components/dashboard/         # NotificationBadgeBtn, TransactionDetailModal
│   ├── constants/                    # categoryPresets, layout, theme (legacy), banks.ts
│   ├── context/ThemeContext.tsx       # Provider de tema light/dark
│   ├── db/                           # SQLite: db.ts (CRUD+indexes), queries.ts (agregados), chatDb.ts
│   ├── features/                     # chat/useLocalNLP.ts
│   ├── hooks/                        # useDashboardScroll, useDashboardSearch, useDashboardTotals, useDashboardTour, useTransactionFilters
│   ├── services/                     # notificationService.ts, notificationHeadlessTask.ts
│   ├── store/                        # 6 stores Zustand (useSettingsStore + useNotificationStore persistidos)
│   │   └── slices/                   # 7 slices de useSettingsStore: budget, categories, debts, goals, notifications, payments, prefs
│   ├── theme/index.ts                # Tokens AppTheme: light + dark
│   ├── types/                        # chat.ts
│   └── utils/                        # formatMoney, nlp, voiceParser, notificationParser, colorUtils, tourRefs, chatHelpers, periodFilter, transactionFormatters, fuzzyMatch
│
├── index.js                          # Entrypoint: registra HeadlessJS task + delega a expo-router/entry
├── android/                          # Proyecto Android nativo (Gradle, manifest, Kotlin)
├── docs/                             # Sitio estático servido por GitHub Pages (landing anterior + política de privacidad)
├── landing/                          # Landing nueva en Next.js 16 + Tailwind v4 (proyecto npm aparte, ver landing/README.md)
├── CONTEXT.md                        # Ventana de contexto técnico completo (~1250 líneas)
├── DOCUMENTATION.md                  # Guía de usuario
└── PRODUCT_REQUIREMENTS.md           # Historias de usuario y requisitos
```

---

## Landing page y GitHub Pages (`docs/`, `landing/`)

- **`landing/` es la landing nueva** (Next.js 16 + Tailwind v4, español e inglés, tema oscuro con el azul de la app), con el diseño y la estructura de la de Meld (`../meld-app/landing`). Es un proyecto npm aparte con su propio `node_modules`: `tsconfig.json`, `metro.config.js`, `eslint.config.js`, `jest.config.js` y `.prettierignore` de la raíz la excluyen. Todo lo operativo (comandos, dónde vive cada texto, qué falta) está en [`landing/README.md`](landing/README.md). Estado: fase 1 (diseño completo, estático) hecha; en vez de descargar el APK ofrece una lista de espera (Resend) hasta que la app llegue a Google Play; el teléfono interactivo, las capturas reales del carrusel y el despliegue en Vercel están pendientes. Hasta desplegarla, la URL pública sigue siendo la de `docs/`.
- El contenido "dentro de la app" que muestra la landing (`landing/src/content/app.ts`) sale de la app real: colores de `categoryPresets.ts`, bancos de `banks.ts`, frases verificadas contra `voiceParser.ts` y notificaciones de `notificationParser/fixtures.ts`. Si cambian el parser, los presets o la lista de bancos, revisar ese archivo.
- `docs/` es el sitio estático servido por **GitHub Pages** para este repo — configurado a nivel de repositorio (rama `master`, carpeta `/docs`), confirmado vía `gh api repos/JhonnyXT/my-wallet-app/pages`. Público en **https://jhonnyxt.github.io/my-wallet-app/**. Esta configuración ya existía antes de documentarse aquí (probablemente para cumplir el requisito de política de privacidad de Play Store).
- Contenido:
  - `docs/index.html` — landing pública de MyWallet (hero, features, CTA de descarga del APK).
  - `docs/privacy-policy.html` — política de privacidad (antes vivía dentro de `index.html`, se separó a su propio archivo).
  - `docs/icon.png`, `docs/favicon.png` — assets del sitio.
- **Relación con Play Store**: `docs/privacy-policy.html` existe para cumplir el requisito de Google Play Console de tener una URL pública de política de privacidad — es un artefacto de *compliance*, no parte de la app en sí (por eso no se documenta en `DOCUMENTATION.md`/`PRODUCT_REQUIREMENTS.md`, que cubren la app, no el sitio de marketing).
- **Proceso manual de release del APK (sin automatizar)**: el botón "Descargar APK" de `docs/index.html` apunta a un asset fijo de un GitHub Release (ej. `https://github.com/JhonnyXT/my-wallet-app/releases/download/v1.5.0/app-release.apk`), no a "la última versión" dinámicamente. Al sacar una versión nueva de la app hay que, manualmente: (1) publicar un GitHub Release nuevo con el APK compilado (`gh release create vX.Y.Z <ruta-al-apk> ...`) y (2) actualizar el link de descarga en `docs/index.html` para que apunte al asset nuevo. Si se omite el paso 2, la landing sigue ofreciendo una versión vieja del APK sin que nada lo avise — no hay CI que sincronice esto.
- La landing de `docs/` se diseñó con ayuda de la skill/plugin `ui-ux-pro-max` (instalada a nivel de usuario de Claude Code, no es parte de este repo). La metodología aplicada —qué se tomó del generador y qué se descartó— está documentada en [`.agents/README.md`](.agents/README.md#diseño-de-la-landing-con-ui-ux-pro-max-metodología).

---

## Rutas de la aplicación

| Ruta | Archivo | Presentación | Descripción |
|------|---------|-------------|-------------|
| `/` | `app/(tabs)/index.tsx` | Tab (default) | Dashboard: balance, gráfica, lista transacciones |
| `/chat` | `app/(tabs)/chat.tsx` | Tab | Chat NLP experimental |
| `/voice-input` | `app/voice-input.tsx` | fullScreenModal ↑ | Entrada por voz con orb animado |
| `/voice-batch-review` | `app/voice-batch-review.tsx` | fullScreenModal ↑ | Revisión de multi-transacciones por voz |
| `/notification-review` | `app/notification-review.tsx` | fullScreenModal ↑ | Revisión de transacciones bancarias detectadas |
| `/active-expense` | `app/active-expense.tsx` | fullScreenModal ↑ | Formulario nuevo gasto/ingreso |
| `/settings` | `app/settings.tsx` | fullScreenModal ↑ | Configuración completa |
| `/reports` | `app/reports.tsx` | fullScreenModal ↑ | "Promedios": promedio mensual histórico de gasto/ingreso por categoría, con tarjeta de tendencia mensual acotable por rango de fechas |
| `/category-onboarding` | `app/category-onboarding.tsx` | fade | Onboarding paso 1: selección inicial de categorías |
| `/notification-onboarding` | `app/notification-onboarding.tsx` | fade | Onboarding paso 2: explica la detección automática de notificaciones bancarias |
| `/bank-selection-onboarding` | `app/bank-selection-onboarding.tsx` | fade | Onboarding paso 3 (último): elegir de qué bancos detectar transacciones |

---

## Stores Zustand

| Store | Persistido | Responsabilidad |
|-------|-----------|-----------------|
| `useFinanceStore` | No (cache SQLite) | Transacciones CRUD + batch |
| `useExpenseStore` | No | Formulario gasto/ingreso activo |
| `useSettingsStore` | AsyncStorage | Config: categorías, presupuesto, metas, deudas, métodos pago, dark mode, onboarding |
| `useVoiceStore` | No | Estado voz: transcript, pendingBatch, pendingManualItem |
| `useNotificationStore` | AsyncStorage | Cola transacciones detectadas desde notificaciones bancarias |
| `useUIStore` | No | Búsqueda (query, tags), filtro por categoría desde el chart, overlay de entrada rápida NLP |

---

## Reglas inmutables

1. **Offline-first**: cero llamadas a APIs externas. SQLite + AsyncStorage son las únicas fuentes de persistencia.
2. **Moneda COP**: formatear con regex `replace(/\B(?=(\d{3})+(?!\d))/g, ".")`. NUNCA `toLocaleString()`.
3. **Fechas locales**: usar `localISOString()` de `src/db/db.ts`. NUNCA `toISOString()`.
4. **Categorías dinámicas**: consultar `userCategories` del store antes de fallbacks legacy.
5. **Git manual**: nunca push automático.
6. **No datos bancarios sensibles**: nunca almacenar números de cuenta/tarjeta.
7. **Botón primario**: `#135BEC` fijo (no `t.accent`) para consistencia entre temas.

---

## Convenciones de código

| Ámbito | Convención | Ejemplo |
|--------|-----------|---------|
| Archivos pantalla | kebab-case | `active-expense.tsx` |
| Componentes UI | PascalCase | `CategoryChart.tsx` |
| Stores | camelCase con `use` | `useFinanceStore.ts` |
| Utilidades | camelCase | `formatMoney.ts` |
| Constantes | UPPER_SNAKE | `BAR_W`, `MAX_BAR_H`, `DEFAULTS` |
| Estilos | `buildStyles(t: AppTheme)` + `useMemo` | — |
| Imports | `@/` desde raíz, orden: React/RN → Expo → Terceros → Locales | — |
| UI texto | Español | — |
| Código / variables | Inglés | — |
| Comentarios | Español | — |

---

## Gotchas críticos

Reglas vigentes. El historial de cómo se llegó a cada una (fechas, intentos revertidos) está en
`CONTEXT.md` §21 y en `git log`.

### Proyecto y dependencias

- `package.json` `"main"` apunta a `index.js` (NO `expo-router/entry`) porque registra el HeadlessJS task para notificaciones bancarias.
- `amount > 0` = gasto, `amount < 0` = ingreso (convención invertida vs lo usual).
- `expo-sharing` está en dependencias pero no se usa en código (se usa `Share` de react-native). No borrarla: `app.config.ts` la tiene como plugin (B9).
- `expo-symbols` no está en `dependencies` pero sí en `node_modules`: es dependencia dura de `expo-router` (feature `native-tabs`, sin uso aquí ni código nativo Android). No declararlo ni intentar quitarlo (B13).
- `tsconfig.json` usa `paths: "@/*": ["./*"]` (toda la raíz). No restringir a `src/` sin verificar que no quiebra importaciones de `app/`, `assets/` etc. (B8).
- `android/` está en `.gitignore` (se regenera con `expo prebuild`): cualquier cambio al proyecto nativo va en un config plugin de `plugins/`, registrado en `app.config.ts`. Hoy hay dos:
  - `withAllowBackupDisabled.js` fuerza `android:allowBackup="false"`: resuelve el conflicto del manifest merger con `react-native-android-notification-listener` y evita que el sistema respalde a la nube datos derivados de notificaciones bancarias (Regla inmutable #6).
  - `withDisableStartingWindowPreview.js` fuerza `android:windowDisablePreview="true"` en `MainActivity` (`launchMode="singleTask"`), para que un cold start no muestre un screenshot cacheado de la última pantalla antes del splash. Requiere `expo prebuild -p android --clean`; no alcanza con `assembleRelease`.
- `Notifications.removeNotificationSubscription()` no existe en `expo-notifications` (SDK 55): limpiar con `subscription.remove()` sobre el objeto que devuelve `addNotificationResponseReceivedListener()`.

### Entorno de desarrollo y dispositivo

- **Si `adb devices`/`adb install` falla con `protocol fault (couldn't read status): Connection reset by peer`** en este entorno: el sandbox mata el daemon de `adb` antes del handshake, no es un problema del proyecto. El SDK está en `~/Android/Sdk`; el workaround está en `.agents/snippets/entorno-android.md` (la sección PowerShell de ese snippet es para el entorno del usuario, no para este sandbox).
- **El APK instalado en el dispositivo suele ser un build *release*** (`adb shell dumpsys package <pkg> | grep flags=` sin `DEBUGGABLE`). Un release embebe el bundle JS y nunca contacta a Metro: ni `adb reverse`, ni `--clear`, ni force-stop reflejan cambios de JS. Para hot reload real, instalar una vez un build debug (`npx expo run:android --port <puerto>`); después el flujo `/dev` funciona. Si tras reiniciar Metro no cambia ni un texto, sospechar de esto primero.
- **ANR intermitente de `RNAndroidNotificationListener` en el Samsung de pruebas.** Con el listener concedido, el sistema falla al bindear el servicio (`Context.startForegroundService() did not then call Service.startForeground()`) y bloquea el hilo principal, a veces cada pocos segundos, en cualquier pantalla. Se reproduce quitando/devolviendo el listener de `settings secure enabled_notification_listeners`. Vive en la librería nativa o en OneUI, no en `app/settings.tsx`; pendiente de investigar aparte. Si taps con coordenadas ya verificadas no producen ningún cambio (ni un `Switch` nativo responde), descartar este ANR antes de sospechar de la lógica de React: el diálogo "isn't responding" no siempre aparece a tiempo en una captura.
- **La detección en background puede detenerse por la gestión de batería del fabricante** (OneUI/MIUI/EMUI matan procesos igual). Android debe re-crear el proceso completo (todo `index.js` + `expo-router/entry`) para la siguiente notificación, y el timeout de 15s de `HeadlessJsTaskService` (nativo, no configurable desde JS) puede no alcanzar en cold starts lentos. La UI de Ajustes no tiene atajo a la optimización de batería (el usuario pidió quitarlo; el código de referencia con `Linking.openSettings()` está en el historial de git antes del 2026-09-02). Reinstalar la app revoca el permiso de "Acceso a notificaciones": hay que volver a concederlo, no es un bug.

### Notificaciones y detección automática

- La configuración de detección automática usa `AsyncStorage` directo (no `useSettingsStore`) para poder leerla desde HeadlessJS sin React. Sus claves `AUTO_DETECT_ENABLED_KEY`/`ALLOWED_BANKS_KEY` viven solo en `src/constants/banks.ts`.
- `notificationService.ts` define 4 canales Android (API 26+): `budget-alerts`, `goal-alerts`, `bank-transactions`, `debt-reminders`. `initNotifications()` corre en el bootstrap de `_layout.tsx` para que existan antes de cualquier notificación.
- `budgetNotifiedMonth` usa claves compuestas `"emoji:threshold"` / `"emoji:overspent"`: hasta 2 notificaciones por categoría por mes (al cruzar el umbral y al superar el 100%).
- **`src/utils/notificationParser/` es una carpeta, un módulo por responsabilidad** (`types`, `intentClassifier`, `amountExtractor`, `directionClassifier`, `descriptionExtractor`, `bankPatterns`, `parseNotification`, `fixtures`); se importa como `@/src/utils/notificationParser`. `intentClassifier` clasifica `otp` / `security_alert` / `payment_reminder` / `marketing` / `app_update` / `possible_transaction` ANTES de parsear, para que recordatorios como "Tienes un pago por $X. Completa tu pago..." no se registren como gasto. Al agregar un patrón: primero el caso en `fixtures.ts` con su resultado esperado, después ajustar `intentClassifier`/`bankPatterns`, y verificar contra todos los fixtures para no romper otro banco.
- **`detectedAt` es la hora real en que el banco posteó la notificación**, no "ahora": `notificationHeadlessTask.ts` convierte `notification.time` (`StatusBarNotification.postTime`) a `Date` y lo pasa como 4º parámetro `postedAt` de `parseNotification()` (default `new Date()`, para fixtures/tests). Es necesario porque `NotificationListenerService` re-entrega las notificaciones que siguen en la bandeja cada vez que el servicio se reconecta (seguido en OneUI). Esa fecha se conserva en todo el flujo: `ReviewItem.date` (desde `detectedAt`), `handleSaveAll` guarda con `new Date(item.date)`, `handleEdit` llama `setCustomDate(new Date(item.date))`, y `ManualAddItem.date` la lleva ida y vuelta a `active-expense.tsx`.
- **Textos de la notificación push** (`notifyBankTransaction()`): el título es una etiqueta corta sin monto ("Nuevo gasto detectado — Bancolombia" con confianza `high`; "¿Nuevo ingreso? — Nequi" con `medium`/`low`). El cuerpo es `shortenDescription(desc, bank, amount)`, que siempre incluye el monto al final vía `formatCOP()` (ej. `"Compra en RAPPI CO · $ 45.000"`); `amtStr` solo sirve de fallback cuando no hay descripción. La notificación nunca escribe en la base de datos: el ítem se guarda solo si el usuario lo confirma.
- **`shortenDescription()`** (`descriptionExtractor.ts`):
  - El verbo lo decide `isExpense` (ya clasificado por `classifyDirection`), no una keyword suelta: cada banco frasea distinto ("enviaron" es ingreso en Nequi). Las keywords solo eligen el verbo dentro de cada rama. Gasto: "Compra", "Pagaste" (`pag...`, pagar en un comercio), "Enviaste" (`envi(aste|ó)`, mandar plata a una persona), "Retiro". Ingreso: "Recibiste", "Ingreso", "Consignación".
  - Transferencias entrantes con el remitente antes del verbo ("Bancolombia te envió...", "Juan Pérez te transfirió...") dan "Recibiste de {remitente}". Ese regex termina en `(?=\s|$)`, no en `\b`: en JS `\w` es solo ASCII, así que `\b` nunca coincide después de una vocal acentuada ("envió").
  - En los demás casos, la contraparte sale de la última frase preposicional ("en X"/"a X"/"de X"/"Comercio: X") del texto limpio.
  - Se usa igual en los 3 lugares que muestran/guardan la descripción: `notifyBankTransaction()`, `pendingToReview()` (`notification-review.tsx`) y `prefillExpenseFromPendingItem()` (`app/_layout.tsx`). La descripción completa del banco sigue en `ParsedTransaction.description`, y la categoría se adivina sobre ese texto crudo (más keywords de comercio), no sobre el corto.
- **Deep link desde notificación push:** `data: { screen: "notification-review", itemId }`, atendido en `_layout.tsx` por `addNotificationResponseReceivedListener` (foreground/background) y `getLastNotificationResponseAsync` (app cerrada). `resolveBankNotificationTarget` decide el destino: si `itemId` es el **único** ítem en `useNotificationStore.pendingItems`, prellena `useExpenseStore` (descripción corta, categoría con `guessCategoryEmoji`, fecha de `detectedAt`, cuenta `"savings"`) y navega a `/active-expense?from=notification-detect&notifId=<id>`; con 2+ pendientes, o si el ítem ya no existe, abre `/notification-review`. `addPendingItem()` devuelve el id agregado (o el del duplicado). Como el `persist` rehidrata async, se busca el ítem con `getPendingItemAfterHydration(id)` (espera `onFinishHydration`, timeout 1.5s); sin eso el primer tap tras un cold start no lo encuentra.
  - No abrir la pantalla sola sin tocar la notificación: Android bloquea lanzar una `Activity` desde background salvo llamadas/alarmas (`USE_FULL_SCREEN_INTENT`), y abusar de eso arriesga rechazo en Play Store.
  - `from=notification-detect` guarda directo en la base de datos (flujo normal de alta) y, al guardar, saca el ítem de la cola (`removePendingItem(notifId)`); cerrar con la X no lo descarta. No confundir con `from=notification-edit`, que solo defiere vía `pendingManualItem` para que `notification-review.tsx` lo recoja.
- La cuenta por defecto de una transacción detectada es `"savings"` (Ahorros), en los 3 lugares: `pendingToReview()`, `handleEdit()` (`setAccount("savings")`) y `prefillExpenseFromPendingItem()`. Si los métodos de pago personalizados no tienen id `"savings"`, el selector queda sin resaltar; es aceptado.

### Categorías, NLP y voz

- **La detección de categoría filtra por tipo gasto/ingreso**, porque las categorías predefinidas comparten keywords entre tipos (`"mensualidad"` en Suscripciones 📱 y Salario 💼; `"regalo"` en Regalos 🎁 y Extra 🎁, en `categoryPresets.ts`).
  - `guessCategoryEmoji(description, userCats?, isExpense?)` (`src/constants/theme.ts`): con `isExpense` filtra `userCats` por `type` y usa `EXPENSE_CATEGORY_MAP`/`INCOME_CATEGORY_MAP`. Sin él busca en ambos tipos (comportamiento legacy; `CATEGORY_MAP` mezclado queda `@deprecated` solo para ese caso). Callers: `pendingToReview()` y `prefillExpenseFromPendingItem()` pasan `item.isExpense`; `parseExpenseInput()` (`nlp.ts`) pasa `true`.
  - `voiceParser.ts`: cada entrada de su `CATEGORY_MAP` local tiene `type: "expense"|"income"` obligatorio, y `extractCategory(text, userCats?, isExpense?)` filtra igual. `processVoiceInput()` calcula `isExpense` (`extractIsExpense`) antes de llamar a `extractCategory`.
  - `extractIsExpense()` no tiene `"mensualidad"` en `incomeKeywords`, porque es ambigua ("pagué mi mensualidad de Netflix" es gasto). No reagregarla: `"salario"`/`"sueldo"`/`"nomina"`/`"recibi"` cubren el ingreso real.
- `reset()` en `useVoiceStore` debe llamarse ANTES de `setPendingBatch()`; al revés, el batch se pierde.
- **`app/voice-input.tsx`: el stop por silencio (timer propio de 2s) no debe perder el dictado.** `expo-speech-recognition` no garantiza un `"result"` con `isFinal:true` antes de `"end"`. Por eso `transcriptTextRef` acumula el transcript en cada `"result"`, y `silenceStopRef` marca que el próximo `stop()` viene del timer. En `"end"`, si `silenceStopRef` está activo y hay texto pendiente, se llama a `handleDone(pending)`. Un stop manual (botón pausar) no activa `silenceStopRef` y queda en pausa sin enviar. Cuando `isFinal` dispara `handleDone`, se vacía `transcriptTextRef` antes de llamarlo, para que un `"end"` inmediato no reprocese el mismo texto.

### Dashboard

- Filtro por categoría: tap corto en una columna del `CategoryChart` activa `useUIStore.setCategoryFilter`. Se limpia con back físico (`BackHandler`) o con un pull-down hecho a mano con `PanResponder` (no `RefreshControl`, para no mostrar spinner de recarga).
- El long-press del `CategoryChart` usa `consumedRef` para que `onTouchEnd` no dispare el tap (filtro) después de que `onPanResponderRelease` consumió el gesto. Conservar ese flag al modificar el componente.
- **"BALANCE NETO" y "Patrimonio neto" usan `allTimeNetBalance` (todo el historial)**, no el período que filtra la gráfica: el balance debe mostrar la plata real aunque el mes visto no tenga movimientos. Excepción: durante una búsqueda (`isSearching`) se usa `netBalance` de los resultados, y la etiqueta dice "BÚSQUEDA · N resultados". Los pills "↓ Gasto / ↑ Ingreso" (`incomeTotal`/`expenseTotal`) sí siguen el período.
- "Patrimonio neto" = `allTimeNetBalance - totalDebt` (suma de `remainingAmount`); solo se muestra si hay deudas activas y fuera de búsqueda/filtro.
- `TransactionItem.tsx` tiene swipe bidireccional: a la izquierda revela eliminar (confirma con `ConfirmDialog`), a la derecha revela editar (`Pencil`, `#135BEC`), que navega a `active-expense.tsx?editId=<id>`.

### Formulario de gasto/ingreso (`app/active-expense.tsx`)

- Tarjeta única con selección inline, sin bottom sheet por campo: IMPORTE editable in-place, fila de descripción (tap despliega nota + tags con `FadeInDown`/`FadeOutUp`, respeta `useReducedMotion()`), fila de fecha (abre `CalendarSheet`). Debajo: categorías en lista horizontal y cuentas en lista vertical, siempre visibles, que seleccionan al tap. Header solo con botón atrás; "Guardar" es un botón fijo abajo. La copia local de `CategorySheet` en `voice-batch-review.tsx` es otra cosa y sigue viva.
- El panel de descripción se cierra solo al volver a tocar su fila o con el botón ✓ (`Keyboard.dismiss()` + cerrar). No poner `onBlur` en la nota: cerraría el panel al pasar al input de tags.
- Campo de monto: sin `selectTextOnFocus` (bug de RN Android con inputs controlados: re-selecciona el texto a mitad de escritura y el siguiente dígito lo sobrescribe); usa `formatMoneyInput()` para los miles en vivo. Sin `includeFontPadding: false` (recorta el primer glifo); usa `paddingHorizontal: 4`. `dynamicAmountStyle` se calcula sobre `amountDisplay` (lo tecleado), no `store.amount`.
- El parser NLP reactivo sobre `store.note` solo ajusta fecha/categoría cuando hay palabras clave explícitas; no toca el monto ni el tipo gasto/ingreso. Se desactiva en los modos edición (`editId`), `batch-review` y `notification-edit`, donde los datos ya vienen estructurados.
- Siempre se muestra el emoji real de la categoría (`cat.key`), nunca un ícono Lucide sustituto.
- **Edición:** `updateTransaction()` existe en `src/db/db.ts` (`UPDATE` real) y en `useFinanceStore`; las transacciones se pueden editar, no solo crear/eliminar. Con `editId`, la pantalla busca la transacción en `useFinanceStore.transactions` (sin query aparte) y prellena el form una sola vez con un guard `useRef` (la lista cambia de referencia seguido y reiniciaría el form a mitad de edición). Guardar llama `updateTransaction()`; el título pasa a "Editar Gasto"/"Editar Ingreso".
- En el branch `batch-review`/`notification-edit` de `handleConfirm`, la fecha se serializa con `localISOString()` (Regla inmutable #3).

### Navegación y arranque

- **Splash sin flash de la pantalla anterior:** `<AnimatedSplash>` se monta siempre que `!splashDone` (no depende de `appReady`); el splash nativo se oculta apenas React pinta el primer frame, y `AnimatedSplash` recibe `ready={appReady}` para no hacer fade-out antes de que termine el bootstrap. En cada cold start sin deep link de notificación, `_layout.tsx` hace `router.replace("/(tabs)")` bajo el splash: en OneUI el `Stack` a veces resuelve su ruta inicial a la última pantalla visitada.
- **Onboarding:** `category-onboarding` → `notification-onboarding` → `bank-selection-onboarding` usan `router.push` (para que atrás funcione). Como `_layout.tsx` entra al onboarding con `router.replace("/category-onboarding")`, `goToApp()` debe hacer `router.dismissAll()` antes de `router.replace("/(tabs)")`; si no, un `dismissAll()` posterior (ej. al guardar un gasto) vuelve al onboarding.

### Sistema de diseño y componentes UI

- **Capa aditiva de tokens (`src/theme/tokens.ts`)**, portada del sistema de diseño de Habit Tracker. Coexiste con `AppTheme`/`useTheme()` sin reemplazarlo: tipografía (`largeTitle`…`sectionHeader`), spacing (`xxs`…`xxl`), `radius`, `motion` (`spring.default`/`spring.snappy`/`pressScale`) y colores anidados (`surface`, `text`, `border`, `accent`, `state`) para light y dark, vía `useAppTokens()` (reutiliza `theme.isDark`). La usan `ThemedText`, `PressableScale`, `Card`/`SectionHeader`/`Divider`, `ListRow`, `StackedScreenHeader`, `settings.tsx` y `reports.tsx`; el resto sigue en `AppTheme` (migrarlo es trabajo futuro). El acento es el de la app (`#135BEC` claro / `#4B82EF` oscuro), no el naranja de Habit Tracker. `dark.surface.primary` es `#0D1117`, igual que `theme.bg`.
- **Botones de confirmar/cancelar/cerrar usan `PressableScale`** (spring de escala de `motion.pressScale`/`spring.snappy`), no `TouchableOpacity`/`Pressable` planos, y las acciones de cancelar/cerrar disparan haptic `Light`. `ConfirmDialog` centraliza el haptic de su "Cancelar".
- **Bottom sheets usan `src/components/ui/BottomSheet.tsx`** (tap fuera y swipe-down para cerrar, sin botón X propio): `CalendarSheet`, el sheet de métodos de pago de `active-expense.tsx`, `SelectorModal` (`settings.tsx`), `MonthPickerModal`, `PeriodSheet` (`FilterChips`), `CategorySheet`/`EditItemSheet` (`voice-batch-review.tsx`). El gesto vive solo en la zona del handle, para no robarle el touch a listas/`ScrollView`, y reclama el responder en el touch-down (`onStartShouldSetPanResponder: () => true`): esperar a `onMoveShouldSetPanResponder` no activaba el swipe de forma confiable. Excepción: `FloatingInput.tsx` conserva su propia animación de entrada (spring de Reanimated) y tiene el mismo swipe-down sobre su handle con `Animated` de RN core anidado (Reanimated maneja mount/unmount, RN core el drag). Pendiente: el sheet de "Bancos activos" en `settings.tsx` (inline, sin `SelectorModal`) aún usa `Modal`+`Pressable` sin swipe-down.
- **Dos calendarios hechos a mano, no fusionar:** `CalendarSheet.tsx` (fecha puntual de una transacción, `AppTheme`, selecciona y cierra en el mismo toque, días futuros deshabilitados, chip "Hoy") y `DateRangeSheet.tsx` (rango para la tarjeta "Tendencia" de `reports.tsx`, `useAppTokens()`, dos toques + accesos "3/6/12 meses" + botón "Aplicar"). Ambos generan el grid mensual sin librería y hacen fade entre meses con Reanimated.
- **`DateRangeSheet` dibuja el rango como una barra continua:** un `View` absoluto detrás de cada día, redondeado solo en los extremos reales (inicio/fin, borde de fila, o celda `null` vecina). Todo el rango va en `accent.default` sólido con texto blanco, por decisión del usuario: no reintroducir un tono distinto para los días intermedios salvo que lo pida. "Aplicar" se deshabilita (escala 0.97) y dice "Elige un rango de al menos 2 meses" si el rango cae en un solo mes, porque la tarjeta es un gráfico de barras mensuales.
- **`ListRow`**: slot `right?: ReactNode` para controles custom (`Switch`, editar/eliminar) y `labelColor?` para labels en acento sin marcarlas `destructive`. `detail` tiene `numberOfLines={1}` + `maxWidth: 120` + `flexShrink: 0` y `label` `numberOfLines={1}`: sin eso un `detail` largo le quita el ancho al label y lo parte en varias líneas (visto en dispositivo real). Si el label se trunca demasiado, acortar el `detail` en el call site. Ícono circular de 34px (`radius.full`). No tiene prop `subtitle` (texto bajo el label), por decisión del usuario; no agregarla salvo que lo pida.
- **`Card`** se distingue del fondo solo por relleno (`surface.secondary` vs `surface.primary`) y esquinas, sin borde (en dark se veía como un aro). El pill "Este mes" de `FilterChips` y el toggle de `reports.tsx` sí llevan `borderWidth: 1.5` + `border.default`: son controles inline, no `Card`.
- **`StackedScreenHeader`** es una barra Material (flecha `ArrowLeft` + título inline) con `title` obligatorio; no existe la variante iOS.

### Ajustes (`app/settings.tsx`)

- Secciones en este orden: CONTROL FINANCIERO → GESTIÓN (Categorías, Métodos de pago, Presupuesto por categoría, Metas de ahorro, Deudas) → DETECCIÓN AUTOMÁTICA ("Detectar transacciones", "Bancos activos") → SISTEMA (Modo oscuro, Exportar datos, Borrar historial, Versión). No hay secciones "APARIENCIA" ni "ACERCA DE", ni párrafos explicativos.
- Cada sección es una sola `Card` con `Divider` entre filas (`inset={tokens.spacing.md * 2 + 34}`), no una tarjeta por fila; el usuario lo prefirió así. Íconos con color propio por fila (verde, azul, morado `#7C3AED`, rojo, gris, `Radar` `#0D9488`, `Landmark` `#EA580C`), no monocromáticos.
- Las filas del screen principal no llevan `detail` (truncaba los títulos: "Ingreso men…"). La única excepción es "Versión" (ícono `Info`, `iconBg={tokens.colors.text.secondary}`, detail `v{APP_VERSION}`), porque ahí el detail es el dato. Las sub-pantallas (`FullScreenModal` de Métodos de pago y Categorías) sí usan `detail`.
- "Metas de ahorro", "Deudas", "Métodos de pago", "Categorías" y "Presupuesto" abren cada una su propio `FullScreenModal`.

### Deudas y metas

- **Deudas** (`src/store/slices/debtsSlice.ts`, 7º slice de `useSettingsStore`): `Debt` = `id, name, emoji, totalAmount, remainingAmount, monthlyPayment, dueDay (1-31), createdAt`. Acciones: `addDebt`, `updateDebtBalance` (pagar, reduce saldo), `editDebt` (nombre/emoji/monto/cuota/día, no toca saldo), `removeDebt`. UI: `DebtsSection` con botones explícitos de editar/eliminar (no swipe), `NuevaDeudaModal` con `DayOfMonthSheet` (grilla 1-31: día que se repite cada mes, no una fecha), `AbonarDeudaModal` (crea un gasto con tag `#deuda` y reduce el saldo).
- Recordatorio de deuda: `scheduleDebtReminder`/`cancelDebtReminder`/`notifyDebtPaidOff` en `notificationService.ts`, con trigger `SchedulableTriggerInputTypes.MONTHLY` el `dueDay` a las 9am. Si ese día no existe en un mes (31 en febrero), ese mes no dispara; es una limitación aceptada.
- **Metas de ahorro** (`goalsSlice.ts`): `editSavingsGoal` edita nombre/emoji/monto objetivo; `updateSavingsGoal` solo registra abonos. `GoalItem` usa botones explícitos de editar/eliminar, igual que Deudas y Métodos de pago.

### Reportes (`app/reports.tsx`, "Promedios")

- Es el único lugar con promedios históricos: responde "¿en qué gasto/gano más en promedio?". No tiene filtro de período global; el ranking y el anillo cubren todo el historial. El único control de período está dentro de la tarjeta "Tendencia" (barras mensuales) y no afecta nada más. Se abre desde el botón `ChartColumn` de `FloatingDock` (pill normal y réplica en el modal de menú).
- `queryCategoryMonthlyAverages()` (`src/db/queries.ts`) divide por la cantidad de meses con al menos una transacción de cualquier categoría, no por los meses de cada categoría: un denominador por categoría inflaría las esporádicas ($300.000 en 1 de 12 meses se vería como "$300.000/mes" en vez de "$25.000/mes"). Acepta `range?`, pero `reports.tsx` la llama sin rango; el rango solo lo usa `queryMonthlyTotalsInRange()`.
- El toggle Gastos/Ingresos usa `SEGMENT_COLORS` (rojo `#FEE2E2`/`#E53E3E`, verde `#DCFCE7`/`#16A34A`), los mismos que los pills del Dashboard, con borde `1.5` + `border.default`.

### Varios

- No hay toasts in-app. Errores críticos: `Alert.alert`. Eventos importantes (presupuesto, transacción detectada, meta cumplida): notificación push del sistema.
- El link de descarga de `docs/index.html` apunta a un asset fijo de un GitHub Release; ver [Landing page y GitHub Pages](#landing-page-y-github-pages-docs) para el proceso manual de cada release.

---

## Deuda técnica documentada

- [ ] **Sin estrategia de testing para componentes `.tsx`, stores Zustand ni `src/db/`**: falta definir el mocking (`jest-expo`, mocks de `expo-sqlite`/AsyncStorage). Hoy Jest cubre solo utilidades puras y parsing (ver Tests).
- [ ] **35 warnings de ESLint** (unused vars, `react-hooks/exhaustive-deps`): legítimos, no bloquean; resolverlos incrementalmente. 0 errores.
- [ ] **Colores de gasto/ingreso (rojo/verde) duplicados sin token compartido**: `app/(tabs)/index.tsx` (`pillExpenseActive`/`pillIncomeActive`) y `app/reports.tsx` (`SEGMENT_COLORS`) repiten a mano `#FEE2E2`/`#E53E3E` y `#DCFCE7`/`#16A34A`; un cambio de paleta obliga a tocar ambos. Candidato a `src/theme/tokens.ts` (evaluar si sirven `state.success`/`state.danger` o hace falta un par propio de gasto/ingreso).
- [ ] **Sin keystore de producción**: `android/app/build.gradle` firma `release` con `signingConfigs.debug` (no existe keystore real ni `keystore.properties`, tampoco localmente). Un APK release firmado así dispara el bloqueo de Google Play Protect al instalarlo a mano; `adb install -r` lo evita. Solución disponible sin ejecutar: `npm run eas:prod` (ver Build variants), con keystore gestionada por EAS. Queda a decisión del usuario correr `eas login` + `npm run eas:prod`.

---

