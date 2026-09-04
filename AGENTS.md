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
Esto importa especialmente para EAS Build (ver Build variants más abajo): corre `npm ci
--include=dev` sin flags propias, así que sin el `.npmrc` el build falla en la fase "Install
dependencies" con `ERESOLVE` — detectado 2026-08-31 en el primer build de EAS del variant
`test`, resuelto agregando el archivo (antes el flag era solo una instrucción manual para
`npm install` local, nunca cubría `npm ci` en CI).

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
Cobertura hoy: utilidades puras y `notificationParser` (`src/utils/**/*.test.ts`, co-locados). Componentes `.tsx`, stores y `src/db/` (SQLite) todavía no tienen estrategia de testing — ver Deuda técnica.

### Lint
```bash
npm run lint          # ESLint (eslint.config.js, flat config)
npm run lint:fix       # con --fix
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```
`.prettierignore` excluye `*.md`/`*.mdc` (docs mantenidas a mano, Prettier rompe el padding de tablas) y `docs/` (landing con CSS compacto hecho a mano) — Prettier es solo para código JS/TS/JSON de `app/`/`src/`/configs de raíz.

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
├── docs/                             # Sitio estático servido por GitHub Pages (landing pública + política de privacidad)
├── CONTEXT.md                        # Ventana de contexto técnico completo (~1250 líneas)
├── DOCUMENTATION.md                  # Guía de usuario
└── PRODUCT_REQUIREMENTS.md           # Historias de usuario y requisitos
```

---

## Landing page y GitHub Pages (`docs/`)

- `docs/` es el sitio estático servido por **GitHub Pages** para este repo — configurado a nivel de repositorio (rama `master`, carpeta `/docs`), confirmado vía `gh api repos/JhonnyXT/my-wallet-app/pages`. Público en **https://jhonnyxt.github.io/my-wallet-app/**. Esta configuración ya existía antes de documentarse aquí (probablemente para cumplir el requisito de política de privacidad de Play Store).
- Contenido:
  - `docs/index.html` — landing pública de MyWallet (hero, features, CTA de descarga del APK).
  - `docs/privacy-policy.html` — política de privacidad (antes vivía dentro de `index.html`, se separó a su propio archivo).
  - `docs/icon.png`, `docs/favicon.png` — assets del sitio.
- **Relación con Play Store**: `docs/privacy-policy.html` existe para cumplir el requisito de Google Play Console de tener una URL pública de política de privacidad — es un artefacto de *compliance*, no parte de la app en sí (por eso no se documenta en `DOCUMENTATION.md`/`PRODUCT_REQUIREMENTS.md`, que cubren la app, no el sitio de marketing).
- **Proceso manual de release del APK (sin automatizar)**: el botón "Descargar APK" de `docs/index.html` apunta a un asset fijo de un GitHub Release (ej. `https://github.com/JhonnyXT/my-wallet-app/releases/download/v1.5.0/app-release.apk`), no a "la última versión" dinámicamente. Al sacar una versión nueva de la app hay que, manualmente: (1) publicar un GitHub Release nuevo con el APK compilado (`gh release create vX.Y.Z <ruta-al-apk> ...`) y (2) actualizar el link de descarga en `docs/index.html` para que apunte al asset nuevo. Si se omite el paso 2, la landing sigue ofreciendo una versión vieja del APK sin que nada lo avise — no hay CI que sincronice esto.
- La landing se diseñó con ayuda de la skill/plugin `ui-ux-pro-max` (instalada a nivel de usuario de Claude Code, no es parte de este repo). La metodología aplicada —qué se tomó del generador y qué se descartó— está documentada en [`.agents/README.md`](.agents/README.md#diseño-de-la-landing-con-ui-ux-pro-max-metodología).

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

- `package.json` `"main"` apunta a `index.js` (NO `expo-router/entry`) porque registra el HeadlessJS task para notificaciones bancarias.
- `amount > 0` = gasto, `amount < 0` = ingreso (convención invertida vs lo usual).
- `expo-sharing` está en dependencias pero NO se usa en código — se reemplazó por `Share` de react-native. No borrar porque `app.config.ts` la tiene como plugin (B9).
- ~~`expo-web-browser` y `expo-symbols` en package.json sin imports directos~~ — **resuelto** (B13): auditados y eliminados de `dependencies`. `expo-web-browser` no lo requería nada (ni código, ni plugin en la config de Expo, ni otro paquete) — se fue por completo de `node_modules`. `expo-symbols` es dependencia dura de `expo-router` (para su feature `native-tabs`, que no usamos, y sin código nativo Android) — sigue instalado transitivamente sin que lo declaremos. Verificado con `expo-doctor`, `expo prebuild -p android --clean` + `assembleRelease` (build exitoso, sin referencias a `expo-web-browser` en el proyecto nativo generado).
- `tsconfig.json` usa `paths: "@/*": ["./*"]` que mapea toda la raíz del proyecto. Suficiente para el setup de Expo Router; no restringir a `src/` sin verificar que no quiebra importaciones de `app/`, `assets/` etc. (B8).
- ~~`useVoiceExpense.ts` en `src/features/voice/` está roto y sin uso~~ — **resuelto**: eliminado (sin importadores, usaba `useUIStore.openExpenseInput` inexistente).
- ~~`ActionPills.tsx`, `CustomTabBar.tsx`, `AnimatedNumber.tsx` son componentes huérfanos~~ — **resuelto**: eliminados (verificado sin imports externos antes de borrar).
- ~~`AUTO_DETECT_ENABLED_KEY` y `ALLOWED_BANKS_KEY` duplicadas~~ — **resuelto**: consolidadas en `src/constants/banks.ts`, importadas desde `app/settings.tsx` y `src/services/notificationHeadlessTask.ts`.
- Configuración de detección automática usa `AsyncStorage` directamente (no `useSettingsStore`) para acceso desde HeadlessJS sin React.
- `notificationService.ts` tiene 3 canales Android (API 26+): `budget-alerts`, `goal-alerts`, `bank-transactions`. Llamar `initNotifications()` en el bootstrap de `_layout.tsx` garantiza que existan antes de cualquier notificación.
- `budgetNotifiedMonth` usa claves compuestas `"emoji:threshold"` / `"emoji:overspent"` para permitir 2 notificaciones por categoría por mes (al cruzar el umbral y al superar el 100%).
- Deep link desde notificación push: `data: { screen: "notification-review" }` → listener en `_layout.tsx` con `addNotificationResponseReceivedListener` y `getLastNotificationResponseAsync` (para app cerrada).
- **`Notifications.removeNotificationSubscription()` ya NO existe en `expo-notifications` (SDK 55)** — la API cambió: `addNotificationResponseReceivedListener()` devuelve un objeto `Subscription` con método propio `.remove()`. Usar `subscription.remove()` en el cleanup del `useEffect`, no la función estática antigua. Detectado por `tsc --noEmit` tras instalar dependencias (`app/_layout.tsx`), corregido en 2026-07-11.
- **Conflicto de manifest Android: `allowBackup` entre la app y `react-native-android-notification-listener`.** El template base de Expo/RN genera `android:allowBackup="true"` en `AndroidManifest.xml`, pero la librería de notificaciones fuerza `allowBackup="false"` en la suya — el manifest merger de Gradle falla si no se resuelve. Como `android/` está en `.gitignore` (se regenera con `expo prebuild`), cualquier fix manual directo sobre el manifest se pierde en el próximo prebuild. Se resolvió con un **config plugin local** (`plugins/withAllowBackupDisabled.js`, registrado en `app.config.ts` → `plugins` (entonces `app.json`, migrado a `app.config.ts` el 2026-08-14 — ver Build variants)) que fuerza `allowBackup="false"` — no `true`, porque es la opción más segura para una app que procesa texto de notificaciones bancarias (consistente con la Regla inmutable #7, no datos bancarios sensibles: no tiene sentido bloquear eso en la DB y dejar que el sistema los respalde a la nube). Este bug estaba latente sin detectar porque nadie había corrido `expo prebuild -p android` + build real en este repo antes (2026-07-13).
- **`src/utils/notificationParser.ts` ahora es una carpeta** (`src/utils/notificationParser/`), un módulo por responsabilidad: `types.ts`, `intentClassifier.ts` (clasifica `otp` / `security_alert` / `payment_reminder` / `marketing` / `app_update` / `possible_transaction` ANTES de intentar parsear nada — reemplaza el antiguo array plano `NOISE_PATTERNS`), `amountExtractor.ts`, `directionClassifier.ts`, `descriptionExtractor.ts`, `bankPatterns.ts` (un patrón por banco), `parseNotification.ts` (orquesta el pipeline, API pública) y `fixtures.ts` (casos reales/sintéticos con resultado esperado). El import externo `@/src/utils/notificationParser` sigue funcionando igual (resuelve a `index.ts`), ningún consumidor cambió.
  - Origen del refactor: Nu (y potencialmente cualquier banco) envía recordatorios de pago pendiente tipo "Tienes un pago por $X. Completa tu pago..." (ej. factura UNE-EPM aún no pagada) que antes se detectaban como gasto real solo por contener un monto y la palabra "pago". Ahora `intentClassifier` los clasifica como `payment_reminder` y se descartan antes de llegar a `bankPatterns`, para los 15 bancos de la whitelist, no solo Nu.
  - Al agregar un patrón nuevo: sumar el caso a `fixtures.ts` primero (con el resultado esperado), después ajustar `intentClassifier`/`bankPatterns`, y volver a verificar contra todos los fixtures — así un ajuste para un banco no rompe silenciosamente un caso ya resuelto de otro.
  - `notifyBankTransaction()` (`src/services/notificationService.ts`) ahora recibe `confidence` y redacta el título/cuerpo distinto: `high` → "detectado" (asertivo); `medium`/`low` → "¿...?" (a confirmar). En ambos casos el item solo se guarda en el historial si el usuario lo confirma manualmente en `notification-review.tsx` — la notificación push nunca escribe en la base de datos por sí sola.
  - **Título sin monto; cuerpo con monto + etiqueta corta de la acción** (2026-07-23): el título es una etiqueta corta ("Nuevo gasto detectado — Bancolombia" / "¿Nuevo ingreso? — Nequi"), sin el monto — antes el monto vivía en el título (`"$45.000 detectado — Bancolombia"`). El cuerpo usa el monto + `shortenDescription()` (nueva función en `descriptionExtractor.ts`), que reduce la descripción completa a "Compra en RAPPI CO" / "Recibiste de Juan Pérez": el verbo (Compra/Pago/Retiro vs Recibiste/Ingreso/Consignación) lo decide **`isExpense`** (ya clasificado por `classifyDirection`), no una keyword suelta del texto — bancos distintos frasean la misma acción distinto (ej. "enviaron" es ingreso en Nequi cuando alguien te manda plata, sería gasto si el usuario envía), así que solo `isExpense` decide la dirección; las keywords dentro de cada rama solo eligen el verbo más específico. La contraparte se extrae de la última frase preposicional ("en X"/"a X"/"de X"/"Comercio: X"). `extractDescription()`/`bankPatterns.ts` no cambiaron — la descripción **completa** capturada del banco sigue viva en `ParsedTransaction.description` y sigue siendo la nota prellenada al editar el ítem (botón ✏️) en `notification-review.tsx`, sin cambios.
- **La detección automática en background puede detenerse por gestión de batería del fabricante (Samsung/Xiaomi/Huawei...), no por un bug de la app.** `RNAndroidNotificationListener` es un `NotificationListenerService` estándar de Android, pero OneUI/MIUI/EMUI matan procesos en background agresivamente igual, y Android debe re-crear el proceso completo (evaluando todo `index.js` + `expo-router/entry`) para procesar la siguiente notificación — con el timeout de 15s de `HeadlessJsTaskService` (librería nativa, no configurable desde JS) esto puede fallar en cold-starts lentos. `app/settings.tsx` (sección `AutoDetectSection`) ahora muestra una tarjeta con botón "Abrir ajustes de batería" (`Linking.openSettings()`, sin pedir el permiso especial `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` para no arriesgar rechazo en Play Store) cuando la detección está activa. Recordar también: **reinstalar la app revoca el permiso de "Acceso a notificaciones"** — hay que volver a concederlo manualmente tras cada reinstalación, no es un bug.
- Filtro por categoría: tap corto en columna del `CategoryChart` activa `useUIStore.setCategoryFilter`. Se limpia con back físico (`BackHandler`) o con un gesto de pull-down implementado a mano vía `PanResponder` (NO `RefreshControl`, para no mostrar spinner de recarga).
- Long-press en `CategoryChart` usa un `consumedRef` para evitar que `onTouchEnd` dispare el tap (filtro) después de que `onPanResponderRelease` ya consumió el gesto. Esta race condition existía en versiones previas y debe preservarse el flag al modificar el componente.
- No usar toasts in-app: el sistema de toasts (`useToastStore`, `ToastContainer`, `ToastBanner`) fue eliminado. Errores críticos usan `Alert.alert`; eventos importantes (presupuesto, transacción detectada, meta cumplida) usan notificaciones push del sistema.
- `reset()` en `useVoiceStore` debe llamarse ANTES de `setPendingBatch()` — si se invierte el orden, el batch se pierde.
- El link de descarga de `docs/index.html` (landing en GitHub Pages) apunta a un asset fijo de un GitHub Release, no a "la última versión" — ver sección [Landing page y GitHub Pages](#landing-page-y-github-pages-docs) para el proceso manual que hay que repetir en cada release nueva.
- **Si `adb devices`/`adb install` falla con `protocol fault (couldn't read status): Connection reset by peer`** al correr `/arrancar`, `/dev` o `/build-apk` en este entorno de desarrollo: no es un problema del proyecto, es que el sandbox mata el daemon de `adb` antes del handshake. El SDK ya está instalado en `~/Android/Sdk`; el workaround (levantar el servidor en primer plano en la misma invocación de shell) está documentado en `.agents/snippets/entorno-android.md` (fuente única, leída por los workflows `build-apk` y `dev`). Esto NO aplica a la sección PowerShell del mismo snippet (para el entorno real del usuario, no para este sandbox).
- **Capa aditiva de tokens (`src/theme/tokens.ts`), puerto del sistema de diseño de Habit Tracker (Bloque B, 2026-08-03).** Coexiste con `AppTheme`/`useTheme()` (`src/theme/index.ts`) sin reemplazarlo: expone tipografía (`largeTitle`/`headline`/`body`/`subheadline`/`footnote`/`sectionHeader`), spacing (`xxs`…`xxl`), `radius`, `motion` (`spring.default`/`spring.snappy`/`pressScale`) y colores anidados `surface.primary/secondary/elevated`, `text.primary/secondary/accent`, `border.default`, `accent.default/subtle`, `state.success/warning/danger/dangerSubtle` — para light y dark — vía el hook `useAppTokens()` (reutiliza `theme.isDark` de `useTheme()`, no duplica la resolución de esquema). Los 23 archivos que ya usan `AppTheme` no se tocaron; solo los componentes nuevos (`ThemedText`, `PressableScale`, `Card`/`SectionHeader`/`Divider`, `ListRow`, `StackedScreenHeader` en `src/components/ui/`) y `app/settings.tsx` consumen `tokens`. El acento sigue siendo el fijo de la app (`#135BEC` claro / `#4B82EF` oscuro), no el naranja de Habit Tracker. Migrar el resto de pantallas a esta capa es trabajo futuro, no de este cambio. (Nota: `tokenColors.dark.surface.primary` cambió después de `#000000` a `#0D1117` el 2026-09-03 para igualar `theme.bg` — ver gotcha con esa fecha más abajo.)
- **`ListRow` (`src/components/ui/ListRow.tsx`) tiene un slot `right?: ReactNode`** que reemplaza detail+chevron por un control custom (`Switch`, botones editar/eliminar, etc.) — necesario porque el `ListRow` de Habit Tracker no contempla `Switch` ni acciones duales. También expone `labelColor?: string` para labels en acento (ej. fila "Agregar método") sin marcarlas `destructive`. **`detail` tiene `numberOfLines={1}` + `maxWidth: 120` + `flexShrink: 0`, y `label` tiene `numberOfLines={1}`**: sin esto, un `detail` largo (ej. "Cuentas y formas de pago") se queda con `flexBasis` de contenido completo y sin `flexShrink`, y le quita casi todo el ancho al `label` (flex:1, `flexBasis: 0%`), partiéndolo en 3-4 líneas ilegibles — detectado en dispositivo físico real, no en el simulador/lint. Si `label` sigue truncándose demasiado agresivo con un `detail` corto, acortar el texto de `detail` en el call site en vez de tocar el componente. **Actualización 2026-09-03:** en la pantalla principal de Ajustes (`SettingsScreen` + `AutoDetectSection`) esto ya no aplica — se quitó el prop `detail` de todas sus filas (el texto gris truncaba el título: "Ingreso men…", "Métodos de …"). La única fila del screen principal que aún pasa `detail` es "Versión" (su contenido es el dato `v{APP_VERSION}`, no un subtítulo). Los `detail` de las sub-pantallas (`FullScreenModal` de Métodos de pago → tipo de cuenta; Categorías → "Predefinida"/"Personalizada") siguen intactos y ahí el guard de `numberOfLines`/`maxWidth` sigue siendo relevante.
- **ANR intermitente de `RNAndroidNotificationListener` en dispositivo físico (Samsung, Android reciente), detectado 2026-08-03, no relacionado con ningún cambio de UI.** Con el listener de notificaciones concedido y activo, el sistema falla al bindear el `NotificationListenerService` con `ActivityManager: ANR ... Reason: Context.startForegroundService() did not then call Service.startForeground()`, bloqueando el hilo principal de forma recurrente (a veces cada pocos segundos) independientemente de la pantalla abierta. Confirmado reproducible quitando y devolviendo `com.mywallet.app/com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener` de `settings secure enabled_notification_listeners` (con el listener quitado, el ANR desaparece). No intentar diagnosticarlo tocando `app/settings.tsx` — vive en la librería nativa `react-native-android-notification-listener` o en cómo esta versión de Android/OneUI exige `startForeground()`. Pendiente de investigar aparte.
- **El APK que suele estar instalado en el dispositivo de este entorno es un build *release* (`flags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]`, sin `DEBUGGABLE`), no un dev-client.** Un build release embebe el bundle JS en tiempo de compilación y **nunca contacta a Metro** — ningún `adb reverse`, `--clear`, deep link o force-stop lo hace reflejar cambios de código; solo lo demuestra `adb shell dumpsys package <pkg> | grep flags=` (comparar con un proyecto hermano que sí tenga `DEBUGGABLE`, ej. Habit Tracker, para confirmar la diferencia). Para ver cambios de JS en vivo con hot reload real hay que instalar un build **debug** una vez (`npx expo run:android --port <puerto>`, deja Metro corriendo y wired) — toma varios minutos pero después el flujo `/dev` (Metro solo) funciona de verdad. Si tras reiniciar Metro y relanzar la app el contenido sigue exactamente igual (ni un solo texto cambia), sospechar primero de esto antes de asumir que el bundle está mal servido.
- **`app/active-expense.tsx` rediseñado (2026-08-12) como tarjeta única con selección inline**, alejándose del patrón de bottom sheets por campo que tenían `CategorySheet`/`AccountSheet`/`ListSheet` (eliminados de este archivo, no confundir con la copia local de `CategorySheet` que sigue viva en `voice-batch-review.tsx`, sin tocar). Estructura nueva: tarjeta con IMPORTE (edición in-place ya existente, solo reestilizada) + fila descripción (tap revela panel colapsable con nota + tags, animado con `FadeInDown`/`FadeOutUp` de Reanimated, respeta `useReducedMotion()`) + fila fecha (abre `CalendarSheet`); debajo, categoría como lista horizontal siempre visible y cuenta como lista vertical siempre visible — ambas seleccionan al tap, sin sheet ni confirmación. Header solo con botón atrás; "Guardar" es un botón fijo abajo (antes vivía arriba a la derecha). El parser NLP reactivo (`useEffect` sobre `store.note`) ya **no** sincroniza el monto ni lo resetea a 0 automáticamente — el monto tiene su propio campo editable y esa sincronización sobrescribía en silencio lo que el usuario ya había fijado a mano.
- **`src/components/ui/BottomSheet.tsx` (nuevo, 2026-08-12): wrapper base para bottom sheets con tap-fuera-para-cerrar y swipe-down-para-cerrar.** El gesto de arrastre vive únicamente en la zona del handle (`PanResponder`, mismo patrón que el pull-to-clear-filter de `CategoryChart`), no en todo el sheet, para no robarle el touch a `ScrollView`/listas del contenido. **Bug real encontrado y corregido durante su creación**: con `onStartShouldSetPanResponder: () => false` (esperando a que `onMoveShouldSetPanResponder` reclamara el gesto en el primer move), el swipe no se activaba de forma confiable; se resolvió reclamando el responder de inmediato en el touch-down (`onStartShouldSetPanResponder: () => true`) ya que la zona del handle no tiene otro contenido compitiendo por el gesto. Ya migrados a este componente (2026-08-12 → 2026-08-14): `CalendarSheet`, el sheet de "Métodos de pago" en `active-expense.tsx`, `SelectorModal` (`app/settings.tsx`), `MonthPickerModal.tsx`, `PeriodSheet` (`FilterChips.tsx`), y `CategorySheet`/`EditItemSheet` en `voice-batch-review.tsx` — todos perdieron su botón "X" de cerrar propio porque ya no hace falta. `FloatingInput.tsx` (entrada rápida flotante) es la única excepción: tiene su propia animación de entrada con spring de Reanimated más elaborada que la de `BottomSheet`, así que en vez de migrar el componente se le agregó el mismo gesto de swipe-down directamente sobre su handle (mismo `PanResponder`/umbrales, pero con `Animated` de RN core anidado dentro del `Animated.View` de Reanimated — dos sistemas de animación distintos conviviendo en el mismo árbol, cada uno responsable de una fase distinta: Reanimated el mount/unmount, RN core el drag interactivo). **Pendiente, no migrado**: el sheet de "Bancos activos" en `app/settings.tsx` (inline, no usa `SelectorModal`) sigue con su propio `Modal`+`Pressable` sin swipe-down.
- **Edición de transacciones existentes (2026-08-14): se agregó `updateTransaction()`** en `src/db/db.ts` (`UPDATE` real, no solo insert+delete) y en `useFinanceStore` — la vieja "regla inmutable" de AGENTS.md que decía "solo crear y eliminar" se retiró a pedido explícito del usuario, ya no aplica. `TransactionItem.tsx` (dashboard) ahora soporta swipe bidireccional: deslizar a la izquierda revela eliminar (con `ConfirmDialog`, antes borraba sin confirmar — bug corregido de paso), deslizar a la derecha revela editar (`Pencil`, azul `#135BEC`, ancla izquierda). Editar navega a `active-expense.tsx?editId=<id>`; esa pantalla detecta `editId` vía `useLocalSearchParams`, busca la transacción en `useFinanceStore.transactions` (ya cargada, no hace query aparte) y prellena el formulario una sola vez con un `useRef` guard (no en cada re-render — la lista de transacciones cambia de referencia todo el tiempo y reiniciaría el form a mitad de edición). Guardar en modo edición llama `updateTransaction()` en vez de `addTransaction()`; el título cambia a "Editar Gasto"/"Editar Ingreso"; el parser NLP reactivo sobre `store.note` se desactiva igual que en los flujos `batch-review`/`notification-edit` (los datos ya vienen estructurados, re-parsear el texto libre sobrescribiría el monto/categoría reales).
- **`src/components/ui/CalendarSheet.tsx` (nuevo, 2026-08-12): calendario mensual minimalista dibujado a mano (sin librería externa), reemplaza el `DateTimePicker` nativo que usaba `active-expense.tsx`.** Grid de 7 columnas generado desde cero por mes (`buildMonthGrid`), días futuros deshabilitados, chip "Hoy" de acceso directo, transición de mes con fade de Reanimated. Selecciona y cierra en el mismo tap (sin botón "confirmar").
- **Al depurar interacciones que "no responden" en este dispositivo físico, descartar primero el ANR intermitente de `RNAndroidNotificationListener` (gotcha de arriba) antes de sospechar de un bug de código.** Confirmado 2026-08-12: una fila que parecía no responder a los taps (con coordenadas correctas, verificadas contra una fila hermana que sí funcionaba) resultó ser el dispositivo real bloqueado por ese ANR — ni siquiera un `Switch` nativo respondía durante el bloqueo. El diálogo "isn't responding" de Android no siempre aparece a tiempo en una captura de pantalla; si taps repetidos con coordenadas ya verificadas no producen ningún cambio (ni siquiera un fondo de modal apareciendo), sospechar del hilo principal bloqueado antes que de la lógica de React.
- **Splash: fix de dos causas distintas del flash de "pantalla anterior" (2026-08-14).** (1) A nivel Android: `MainActivity` usa `launchMode="singleTask"`; al relanzar la app tras un cold start (proceso matado en background o cierre completo), el sistema mostraba como "starting window" un screenshot cacheado del último estado antes de pintar el splash real. Se agregó `plugins/withDisableStartingWindowPreview.js` (mismo patrón que `withAllowBackupDisabled.js`) que fuerza `android:windowDisablePreview="true"` en `MainActivity` — requiere `expo prebuild -p android --clean` para aplicarse, no alcanza con `assembleRelease` solo. (2) A nivel JS: `app/_layout.tsx` ocultaba el splash nativo (`SplashScreen.hideAsync()`) *antes* de montar `<AnimatedSplash>`, dejando un hueco de frames con el `Stack` visible; ahora `AnimatedSplash` se monta siempre que `!splashDone` (ya no depende de `appReady`) y el splash nativo se oculta apenas React pinta el primer frame — `AnimatedSplash` recibe `ready={appReady}` y no hace fade-out hasta que el bootstrap termine. Además, `app/_layout.tsx` fuerza `router.replace("/(tabs)")` en cada cold start sin deep link de notificación (bajo el splash, invisible) — sin esto, en este dispositivo Samsung/OneUI el `Stack` a veces resolvía su ruta inicial hacia la última pantalla visitada en vez de `"(tabs)"`.
- **`app/active-expense.tsx`: tres bugs de la tarjeta IMPORTE corregidos (2026-08-14).** (1) El panel colapsable de descripción+tags tenía `onBlur={() => setDescOpen(false)}` en el `TextInput` de la nota — al tocar el input de tags (otro `TextInput` del mismo panel), la nota perdía foco y cerraba todo el panel antes de que el tag pudiera recibir el toque. Se quitó ese `onBlur`; el panel ahora solo cierra al volver a tocar la fila de descripción, o con el botón ✓ nuevo en la esquina superior derecha del panel (`Keyboard.dismiss()` + `setDescOpen(false)`). (2) `selectTextOnFocus` en el `TextInput` del monto causaba que, en Android, el texto completo se re-seleccionara en momentos inesperados durante la escritura (típicamente cerca del 3er dígito) y el siguiente dígito lo sobrescribía — bug conocido de RN Android con inputs controlados. Se quitó la prop; ahora usa `formatMoneyInput()` (mismo helper que `settings.tsx`/`CategoryChart.tsx`) para separador de miles en vivo. (3) `includeFontPadding: false` + `padding: 0` en ese mismo input recortaba el primer glifo (ej. el "1" de "1.000") — se quitó `includeFontPadding: false` y se usa `paddingHorizontal: 4` en su lugar.
- **`PressableScale` (existente, portado de Habit Tracker) se extendió a los botones de confirmar/cancelar/cerrar de toda la app (2026-08-14)** — antes solo lo usaban `ListRow`/`StackedScreenHeader`. Reemplaza `TouchableOpacity`/`Pressable` planos (solo dimming de opacidad) por el spring de escala ya definido en `src/theme/tokens.ts` (`motion.pressScale`/`spring.snappy`), sin tocar la apariencia visual de cada botón (mismos estilos, colores, sombras — solo cambia el wrapper interactivo). Migrado en: `active-expense.tsx` (X, Guardar), `settings.tsx` (Cancelar/Guardar de los 4 modales, ✕/Cancelar de editar categoría, "Abrir ajustes de batería"), `category-onboarding.tsx` (Guardar, ← Volver, modal nueva categoría), `notification-review.tsx` (back, Descartar todo, Entendido, Guardar todo), `voice-input.tsx` (X, disclosure del micrófono), `voice-batch-review.tsx` (back, Guardar todo, sheets), y `ConfirmDialog.tsx` (Cancelar/Confirmar). De paso se agregó haptic `Light` a las mismas acciones de cancelar/cerrar — antes solo el éxito disparaba haptics (`ConfirmDialog` centraliza el de "Cancelar", cubre todos los diálogos destructivos de la app automáticamente).
- **`app/settings.tsx` rediseñado de iOS a Material (2026-08-17).** `StackedScreenHeader` **ya no tiene la variante iOS original** (botón circular flotante + `ChevronLeft` + large title duplicado en el body) — se eliminó del componente por completo; ahora exige `title` (prop obligatoria) y renderiza una única barra tipo Material (flecha llana `ArrowLeft` + título inline en la misma fila). `Card` ganó `borderWidth: 1.5` + `border.default` (mismo lenguaje que el pill "Este mes" de `FilterChips`). `ListRow` cambió el badge de icono de cuadrado redondeado (30px) a círculo completo (34px, `radius.full`). Las secciones con varias opciones (Gestión, Detección Automática, Métodos de pago) se fusionaron en una sola `Card` con `Divider` entre filas — se probó una tarjeta bordeada por fila y se revirtió a pedido del usuario, igual que los colores de icono monocromáticos (se mantienen los colores por fila: verde, azul, morado `#7C3AED`, rojo, gris). Reordenamiento: CONTROL FINANCIERO → GESTIÓN (Categorías, Métodos de pago, Presupuesto por categoría, Metas de ahorro, Deudas) → DETECCIÓN AUTOMÁTICA → APARIENCIA → SISTEMA → ACERCA DE. "Metas de ahorro" dejó de ser una sección grande inline en la pantalla principal — ahora es una fila más en Gestión que abre su propio `FullScreenModal` (mismo patrón que Métodos de pago/Categorías/Presupuesto). Las dos tarjetas de texto largo de Detección Automática (privacidad + batería) se redujeron a una sola fila de acción "Optimización de batería" — se quitó el párrafo de privacidad. Los emojis 🏦/🏛️ de "Detectar transacciones"/"Bancos activos" se reemplazaron por íconos vectoriales de `lucide-react-native` (`Radar` `#0D9488`, `Landmark` `#EA580C`).
- **Nueva feature: Deudas (`src/store/slices/debtsSlice.ts`, 2026-08-17), 7º slice de `useSettingsStore`.** Tipo `Debt`: `id, name, emoji, totalAmount, remainingAmount, monthlyPayment, dueDay (1-31), createdAt`. CRUD: `addDebt`, `updateDebtBalance` (flujo "Pagar", reduce saldo), `editDebt` (edita nombre/emoji/monto/cuota/día, no toca saldo), `removeDebt`. UI en `app/settings.tsx`: fila "Deudas" en Gestión → `FullScreenModal` → `DebtsSection` (lista de `DebtItem` con iconos de editar/eliminar explícitos, como en Métodos de pago — no swipe-to-delete), `NuevaDeudaModal` (crear/editar, con `DayOfMonthSheet` — grilla 1-31 para el día de pago recurrente, sin mes/año porque no es una fecha puntual sino un día que se repite todos los meses), `AbonarDeudaModal` (pagar, crea una transacción de gasto con tag `#deuda` y reduce el saldo). Recordatorio de pago: `src/services/notificationService.ts` agregó el canal `debt-reminders` y `scheduleDebtReminder`/`cancelDebtReminder`/`notifyDebtPaidOff`, usando un trigger `MONTHLY` nativo de `expo-notifications` (`SchedulableTriggerInputTypes.MONTHLY`, dispara en `dueDay` a las 9am) — primera vez que se usa un trigger programado por fecha en este proyecto (todo lo anterior era disparo inmediato, `trigger: null`). Si `dueDay` no existe en un mes (ej. 31 en febrero), ese mes no dispara — limitación documentada en el código, no un bug. Integración con el Dashboard: línea "Patrimonio neto" bajo el balance (solo visible si hay deudas activas, fuera de búsqueda/filtro), `netBalance - totalDebt` (suma de `remainingAmount` de todas las deudas) vía `formatBalance`.
- **"Metas de ahorro" (`goalsSlice.ts`) ganó `editSavingsGoal`** (edita nombre/emoji/monto objetivo, separado de `updateSavingsGoal` que solo maneja el abono) — mismo patrón editar/eliminar explícito que Deudas y Métodos de pago (`GoalItem`, ya no `SwipeableGoalItem` con swipe-to-delete).
- **Fix de navegación de onboarding (2026-08-17): `app/bank-selection-onboarding.tsx` — `goToApp()` ahora hace `router.dismissAll()` antes de `router.replace("/(tabs)")`.** Causa raíz: la cadena de onboarding (`category-onboarding` → `notification-onboarding` → `bank-selection-onboarding`) usa `router.push` entre pasos (para que el botón atrás funcione), pero como `_layout.tsx` hace `router.replace("/category-onboarding")` al iniciar el onboarding (reemplazando `(tabs)` como raíz del stack), sin el `dismissAll()` el stack quedaba como `[category-onboarding, notification-onboarding, (tabs)]` — cualquier `router.dismissAll()` posterior (ej. al guardar un gasto desde `active-expense.tsx`) te devolvía a `category-onboarding` en vez del dashboard.
- **`app/active-expense.tsx` (2026-08-17): se eliminó la tabla `CATEGORY_ICONS`** que sustituía el emoji real de la categoría (elegido en onboarding) por un ícono vectorial genérico de Lucide para ~13 emojis "conocidos" — ahora siempre se muestra el emoji real (`cat.key`), nunca un ícono sustituto. También se eliminó la detección automática de tipo ingreso/gasto (`store.setIsExpense`) desde el texto libre de la descripción — el parser reactivo sobre `store.note` ya no cambia el tipo, solo fecha/categoría cuando hay palabras clave explícitas. Fix adicional: el tamaño de fuente dinámico del campo de importe (`dynamicAmountStyle`) leía `store.amount` (valor ya confirmado) en vez del valor tecleado en vivo (`amountDisplay`) — con montos grandes el texto no se achicaba a tiempo. Fix de fecha: al editar un ítem desde `notification-review.tsx` (`from=notification-edit`), la fecha ya no se resetea a "hoy" (ver gotcha siguiente).
- **Fix de bug de fecha en detección automática (`app/notification-review.tsx`, `src/store/useVoiceStore.ts`, 2026-08-17).** `ReviewItem` ahora tiene un campo `date` (ISO), poblado desde `PendingNotificationItem.detectedAt` (el timestamp real de cuando se detectó la notificación bancaria) — antes se perdía por completo al mapear a `ReviewItem` y todo se guardaba con la fecha de hoy. `handleSaveAll` ahora guarda cada transacción con `new Date(item.date)` en vez de `new Date()`. `handleEdit` llama `expenseStore.setCustomDate(new Date(item.date))` antes de navegar a `active-expense.tsx`, así el editor abre con la fecha real detectada. `ManualAddItem` (`useVoiceStore.ts`) ganó un campo opcional `date?: string` para no perder la fecha al ir y volver de `active-expense.tsx` en el flujo de edición.
- **Pantalla nueva: `app/reports.tsx` ("Promedios", 2026-08-18) — único lugar de la app que muestra un promedio histórico, no un total de período.** Todo el resto del dashboard (`CategoryChart`, balance, lista) opera sobre el período filtrado actual; esta pantalla es la respuesta a "¿en qué gasto/gano más en promedio?" y deliberadamente NO tiene filtro de período global — el ranking y el anillo siempre cubren todo el historial. El único control de período de la pantalla vive dentro de la tarjeta "Tendencia" (gráfico de barras mensuales) y no afecta nada más. Accesible desde un botón nuevo (`ChartColumn` de lucide) en `FloatingDock` (`handleReports()` → `router.push("/reports")`), tanto en el pill normal como en su réplica dentro del modal de menú.
- **`queryCategoryMonthlyAverages()` (`src/db/queries.ts`) usa un denominador de meses compartido entre categorías, no uno por categoría.** El denominador (`months`) es la cantidad de meses distintos con AL MENOS una transacción de cualquier categoría — no la cantidad de meses en los que esa categoría específica tuvo movimiento. Es deliberado: usar un denominador por categoría inflaría el promedio de categorías esporádicas (ej. una categoría con una sola transacción de $300.000 en un historial de 12 meses activos mostraría "$300.000/mes" en vez de "$25.000/mes"). La función acepta un `range?: DateRange` opcional para acotar la ventana de cálculo, pero `reports.tsx` la llama siempre sin `range` (todo el historial) — el rango solo se usa en `queryMonthlyTotalsInRange()`, para la tarjeta "Tendencia".
- **Dos calendarios dibujados a mano con propósitos distintos, no confundir ni fusionar:** `CalendarSheet.tsx` (fecha puntual, para el campo "Fecha" de una transacción, usa `AppTheme`/`useTheme()` legacy) vs `DateRangeSheet.tsx` (rango desde–hasta, para acotar la tarjeta "Tendencia" de `reports.tsx`, usa `useAppTokens()`). Ambos comparten el mismo patrón de grid mensual sin librería externa y fade entre meses con Reanimated, pero no son intercambiables: `DateRangeSheet` requiere dos toques (inicio/fin, con accesos rápidos "3/6/12 meses") y un botón "Aplicar" explícito; `CalendarSheet` selecciona y cierra en el mismo toque.
- **`DateRangeSheet.tsx` rediseñado a "barra continua" tras varias iteraciones (2026-08-18).** El render del rango pasó de círculos independientes (36×36 fijo) → `dayCircle` de tamaño relativo (`width: "76%"`, `aspectRatio: 1`) → una barra/pill continua real: un `View` "connector" de posición absoluta detrás de cada día en rango, redondeado (`borderRadius: 999`) solo en los extremos verdaderos del rango completo (día de inicio/fin, borde de fila al cruzar de semana, o celda vecina `null` del grid — mes fuera de vista, ej. el borde de un rango "1 año" que empieza en otro mes) y cuadrado en el resto de las uniones, para que se lea como una sola franja. Color: se simplificó de "inicio/fin en `accent.default` sólido, intermedios en `accent.subtle`" a **todo el rango con el mismo `accent.default` sólido y texto blanco** — decisión explícita del usuario, no reintroducir el tono diferenciado sin que lo pida de nuevo. Se agregó además una validación `isValidRange = !isSameMonth(rangeStart, rangeEnd)`: el botón "Aplicar" se deshabilita (con `withSpring` a escala 0.97) y cambia su texto a "Elige un rango de al menos 2 meses" si el rango cae dentro de un solo mes — la tarjeta "Tendencia" es un gráfico de barras mensuales, con 1 mes se ve una sola barra sin nada que comparar.
- **`app/reports.tsx`: el toggle Gastos/Ingresos ya no usa `accent.default` genérico — reutiliza los colores rojo/verde de los pills "↓ Gasto / ↑ Ingreso" del Dashboard (2026-08-18).** Constante local `SEGMENT_COLORS` en `reports.tsx` (`expense: {bg: "#FEE2E2", text: "#E53E3E"}`, `income: {bg: "#DCFCE7", text: "#16A34A"}`) — mismos valores hardcodeados que `pillExpenseActive`/`pillIncomeActive` de `app/(tabs)/index.tsx`, copiados a mano, sin token compartido (ver Deuda técnica). El contenedor exterior del toggle también ganó `borderWidth: 1.5` + `tokens.colors.border.default`, mismo lenguaje que el pill "Este mes" de `FilterChips` y las `Card` de `settings.tsx`.
- **Deep link directo a `active-expense.tsx` prellenado al tocar una notificación bancaria, cuando es la única pendiente (2026-09-02).** Antes, tocar cualquier notificación de transacción detectada siempre abría `notification-review.tsx` (la lista), aunque hubiera un solo item — un paso extra innecesario para el caso más común. Se evaluó (a pedido del usuario, vía `AskUserQuestion`) hacer que la pantalla se abriera sola sin tocar nada, y se descartó: Android bloquea lanzar una `Activity` desde background sin gesto del usuario salvo para llamadas/alarmas (`USE_FULL_SCREEN_INTENT`), y abusar de eso para una notificación bancaria de rutina arriesga rechazo en review de Play Store — además de requerir un cold-start completo del bundle JS solo para mostrar una pantalla. La solución implementada mantiene el gesto real del usuario (tocar la notificación del sistema) pero cambia el destino:
  - `useNotificationStore.addPendingItem()` ahora **devuelve el id** del item agregado (o el del duplicado si no agregó nada) — antes no devolvía nada. `notificationHeadlessTask.ts` pasa ese id a `notifyBankTransaction()` (nuevo parámetro opcional `itemId`), que lo mete en `data.itemId` del payload de la notificación push.
  - `app/_layout.tsx` (`resolveBankNotificationTarget`, corre en ambos listeners: `getLastNotificationResponseAsync` para cold start y `addNotificationResponseReceivedListener` para foreground/background) resuelve el destino: si `data.itemId` sigue siendo el **único** item en `useNotificationStore.getState().pendingItems` (no solo que exista — que sea el único), prellena `useExpenseStore` (mismo criterio que `pendingToReview`/`handleEdit` de `notification-review.tsx`: descripción = texto del banco o su nombre, categoría adivinada con `guessCategoryEmoji`, fecha real de `detectedAt`) y navega a `/active-expense?from=notification-detect&notifId=<id>`. Si hay 2+ pendientes o el item ya no existe (guardado/descartado desde otro lado), cae al comportamiento de siempre (`/notification-review`).
  - Como el `persist` de `useNotificationStore` rehidrata desde AsyncStorage de forma async, y este código puede correr en un cold start antes de que termine, se agregó `getPendingItemAfterHydration(id)` (exportada desde `useNotificationStore.ts`) que espera `persist.onFinishHydration()` (con timeout de seguridad de 1.5s) antes de buscar el item — sin esto, el primer tap tras un cold start podía fallar en encontrar el item aunque sí estuviera guardado.
  - Nuevo modo `from=notification-detect` en `active-expense.tsx` (**no confundir con `notification-edit`**, que solo defiere vía `pendingManualItem` esperando que `notification-review.tsx` lo recoja): `notification-detect` sí guarda directo en la base de datos (mismo camino que crear una transacción nueva — cae al `else` del flujo normal en `handleConfirm`, no al branch de batch/edit) y, tras guardar con éxito, saca el item de la cola (`removePendingItem(notifId)`) para que no reaparezca duplicado. Cerrar con la X **no** descarta el item de la cola (sigue disponible vía el badge 🔔 del Dashboard) — solo se remueve al guardar efectivamente.
- **`Card.tsx` perdió el `borderWidth: 1.5` + `border.default` que había ganado en el rediseño Material de `settings.tsx` (2026-08-17, ver arriba) — a pedido explícito del usuario (2026-09-02), se veía como un aro blanco/gris alrededor de cada tarjeta en tema oscuro.** Ahora se distingue del fondo solo por color de relleno (`surface.secondary` vs `surface.primary`) y esquinas redondeadas. El pill "Este mes" de `FilterChips` y el toggle Gastos/Ingresos de `reports.tsx` (`SEGMENT_COLORS`) **conservan** su borde propio — son controles inline, no `Card`, y no se tocaron. **Esta sí quedó** (a diferencia del intento de `subtitle` en `ListRow` del mismo día, ver deuda técnica: se probó y se revirtió).
- **Bug de fecha en detección automática, causa real encontrada (2026-09-02) — el fix de 2026-08-17 (ver gotcha de esa fecha) no lo cubría del todo.** `detectedAt` se seguía poniendo en `localISOString()` = "ahora" en el momento en que `parseNotification()` corría, no cuando la notificación bancaria realmente se posteó. Como `NotificationListenerService` de Android **re-entrega notificaciones ya existentes** cada vez que el servicio se reconecta (ej. tras el ANR/kill de batería documentado arriba para Samsung/OneUI, que ocurre seguido), cualquier notificación bancaria que siguiera en la bandeja terminaba reprocesándose con `detectedAt = ahora` una y otra vez — por eso la fecha al editar un ítem detectado siempre mostraba el día actual, sin importar cuándo había llegado la transacción real. Fix: `RawNotification` (`notificationHeadlessTask.ts`) ya tenía un campo `time` sin usar — es el `StatusBarNotification.postTime` real de Android (ms desde epoch), que la librería expone pero nadie leía. `parseNotification()` ahora acepta un 4º parámetro opcional `postedAt: Date` (default `new Date()`, así los fixtures/tests no necesitan tocarse) y lo usa para `detectedAt` en vez de "ahora"; `notificationHeadlessTask.ts` parsea `notification.time` a `Date` y se lo pasa. De paso se corrigió `app/active-expense.tsx`: el branch `batch-review`/`notification-edit` de `handleConfirm` usaba `editedDate.toISOString()` (UTC, viola la regla inmutable #3 de este documento) en vez de `localISOString()` — no era la causa raíz del bug reportado, pero sí una inconsistencia real que se corrigió de paso.
- **Cuenta por defecto al editar/guardar una transacción detectada por notificación cambió de "credit" (Tarjeta) a "savings" (Ahorros), a pedido del usuario (2026-09-02).** Tres lugares debían quedar consistentes: `pendingToReview()` en `notification-review.tsx` (fallback usado si se guarda el lote sin editar ningún ítem), su `handleEdit()` (ahora llama `expenseStore.setAccount("savings")`, antes no seteaba cuenta en absoluto — el selector quedaba con lo que el store tuviera de una edición anterior), y `prefillExpenseFromPendingItem()` en `app/_layout.tsx` (el flujo directo `notification-detect`, mismo problema: nunca seteaba cuenta). Si los métodos de pago del usuario son personalizados y ninguno tiene id `"savings"`, el selector queda sin nada resaltado — comportamiento aceptado, no es un caso que se intente cubrir.
- **Prop `subtitle` en `ListRow.tsx` (texto bajo el label, portado de un diseño de referencia) se probó y se revirtió el mismo día (2026-09-02) — no reintroducir sin que el usuario lo pida de nuevo.** Se aplicó a toda la pantalla principal de Ajustes (ícono 34px→40px, fila 48px→64px, `Divider` inset `+34`→`+40`), pero el usuario lo marcó como innecesario. `ListRow.tsx` quedó exactamente como estaba antes (sin prop `subtitle`, ícono 34px); los 11 `Divider inset={tokens.spacing.md * 2 + 40}` de `settings.tsx` volvieron a `+ 34`. La única pieza de ese intento que **sí** se mantuvo fue quitarle el borde a `Card.tsx` (gotcha anterior) — eso el usuario lo pidió aparte y explícitamente.
- **"BALANCE NETO" del Dashboard (`app/(tabs)/index.tsx`) ahora es SIEMPRE sobre todo el historial, no el del período/mes que esté filtrando la gráfica (2026-09-02, pedido explícito del usuario).** Antes `netBalance` (`useDashboardTotals.ts`) se calculaba desde `typeFilteredTransactions`/`searchedTransactions` — las mismas transacciones ya acotadas por el filtro de período (`FilterChips`) que alimentan la gráfica de categorías. Al cambiar de mes (o cuando el mes nuevo todavía no tenía transacciones), el balance se iba a $0 en vez de seguir mostrando la plata real que la persona tiene. Se agregó `allTimeNetBalance` al hook — mismo cálculo (ingresos − gastos) pero sobre `transactions` sin filtrar por período. El Dashboard usa `allTimeNetBalance` para "BALANCE NETO" y "Patrimonio neto" **excepto durante una búsqueda** (`isSearching`), donde se mantiene `netBalance` (neto de los resultados encontrados, ya intencional) — ahí la etiqueta ya dice "BÚSQUEDA · N resultados", así que mostrar el balance total confundiría el número con el conteo. `incomeTotal`/`expenseTotal` (los pills "↓ Gasto / ↑ Ingreso") siguen acotados al período — eso sí debe reflejar el mes que se está viendo, es un cambio deliberadamente distinto del balance.
- **`app/settings.tsx`: se eliminó la fila "Optimización de batería" de Detección Automática y se fusionaron APARIENCIA + SISTEMA + ACERCA DE en una sola sección "SISTEMA" (2026-09-02, pedido explícito del usuario).** El acceso directo a `Linking.openSettings()` para desactivar la optimización de batería del fabricante (Samsung/Xiaomi/Huawei...) ya no está en la UI — el problema de fondo (el sistema puede matar el listener en background, ver gotcha de ANR más arriba) sigue existiendo, solo se quitó el atajo; si hace falta reintroducirlo, el código de referencia es el commit anterior a esta fecha (`Linking`/`BatteryWarning`, ambos removidos de los imports por quedar sin uso). Reordenamiento resultante: CONTROL FINANCIERO → GESTIÓN → DETECCIÓN AUTOMÁTICA (solo "Detectar transacciones" + "Bancos activos" ahora) → **SISTEMA** (Modo oscuro, Exportar datos, Borrar historial, Versión — antes repartidos en 3 secciones distintas: Apariencia, Sistema, Acerca de). Ya no existen las secciones "APARIENCIA" ni "ACERCA DE" como tales.
- **`app/settings.tsx`: se quitaron los subtítulos (`detail`) de todas las filas del screen principal y se reubicó "Versión" (2026-09-03, pedido explícito del usuario).** El prop `detail` (texto gris secundario) se eliminó de `SettingsScreen` y de `AutoDetectSection` en TODAS sus filas: Ingreso mensual, Categorías, Métodos de pago, Presupuesto por categoría, Metas de ahorro, Deudas, Detectar transacciones, Bancos activos, Modo oscuro, Exportar datos. Hacían que el título se truncara ("Ingreso men…", "Métodos de …", "Presupuesto …"); ahora cada fila es solo ícono + título + flecha. Además se quitó el párrafo `ThemedText` al pie de la sección SISTEMA ("Exportar genera un CSV con tus transacciones. Borrar historial elimina…"). La fila "Versión" pasó de `<ListRow label="Versión" detail={...} />` (sin ícono) a tener ícono circular (`Info` de lucide, `iconBg={tokens.colors.text.secondary}`) + el valor `v{APP_VERSION}` a la derecha — es la **única** fila del screen principal que conserva `detail` (su contenido es el dato, no un subtítulo redundante). Los `detail` de las sub-pantallas (`FullScreenModal` de Métodos de pago → tipo de cuenta; Categorías → "Predefinida"/"Personalizada") NO se tocaron. Variables que quedaron sin uso y se eliminaron: `incomeSubtitle`, `darkLabel`, `activeCount`, y los selectores `savingsGoals`/`debts` de `SettingsScreen`.
- **`tokenColors.dark.surface.primary` (`src/theme/tokens.ts`) pasó de `#000000` a `#0D1117` (2026-09-03).** Iguala `theme.bg` del Dashboard (`AppTheme`, que ya era `#0D1117` en dark) — el fondo de pantalla de `app/settings.tsx` (main + sus `FullScreenModal`) y `app/reports.tsx` dejó de ser negro puro y ahora coincide con el resto de la app en modo oscuro. Modo claro (`#F2F2F4`) sin cambios. `dark.surface.secondary`/`elevated` (`#1C1C1F`/`#2A2A2E`) no se tocaron.

---

## Deuda técnica documentada

- [x] ~~Sin framework de testing (ni Jest ni Vitest)~~ — Jest instalado (`jest.config.js`, `npm test`). Cobertura: los 9 fixtures de `notificationParser/fixtures.ts` (uno por `it()`) + `formatMoney`, `periodFilter`, `colorUtils`, `transactionFormatters`, `voiceParser`, `nlp` (65 tests, 0 fallos). Alcance actual: solo utilidades puras y lógica de parsing — componentes `.tsx`, stores Zustand y `src/db/` (SQLite) quedan fuera hasta definir estrategia de mocking (`jest-expo`, mocks de `expo-sqlite`/AsyncStorage). Al escribir un test que importe (aunque sea transitivamente) algo de `src/db/`, mockear solo la función puntual usada — ver ejemplo en `parseNotification.test.ts`, que mockea `localISOString` sin traer `expo-sqlite`.
- [x] ~~Sin ESLint ni Prettier configurados~~ — `eslint-config-expo@~55.0.1` (flat config, pineado a la versión de SDK 55) + Prettier. `react/no-unescaped-entities` desactivada (regla de React DOM sin sentido en RN, ver `eslint.config.js`). Todo el código de `app/`/`src/`/configs de raíz reformateado; docs (`*.md`/`*.mdc`) y `docs/` (landing) excluidos a propósito de Prettier — ver sección Lint arriba. Estado: 0 errores, 35 warnings legítimos (unused vars, `react-hooks/exhaustive-deps`) pendientes de resolver incrementalmente, no bloquean nada.
- [x] ~~3 componentes huérfanos: `ActionPills`, `CustomTabBar`, `AnimatedNumber`~~ — eliminados
- [x] ~~Hook muerto: `src/features/voice/useVoiceExpense.ts`~~ — eliminado
- [x] ~~Constantes AsyncStorage duplicadas (settings.tsx + notificationHeadlessTask.ts)~~ — consolidadas en `src/constants/banks.ts`
- [x] ~~Dependencias posiblemente no usadas: `expo-web-browser`, `expo-symbols`~~ — eliminadas de `dependencies` (ver B13 arriba)
- [x] ~~Varios `as any` localizados (SpeechModule types, estilos porcentuales Reanimated)~~ — eliminados. `BudgetBar.tsx`: `as any` en `withTiming(...)` reemplazado por el cast específico `as \`${number}%\`` (el tipo real que espera `DimensionValue` de RN, no `string` genérico). `voice-input.tsx`: los callbacks de `SpeechModule.addListener` usaban `(e: any)`/`(event: any)` con una interfaz manual — se tipó con los overloads reales (`addListener(event: "error"|"result", ...)`) usando los tipos que ya exporta `expo-speech-recognition` (`ExpoSpeechRecognitionErrorEvent`, `ExpoSpeechRecognitionResultEvent`) vía `import type` (sin efecto en runtime, no rompe el guard de Expo Go). Verificado: `grep -rn "as any\|: any\b" app/ src/` vacío en todo el repo.
- [ ] **Colores de gasto/ingreso (rojo/verde) duplicados sin token compartido**: `app/(tabs)/index.tsx` (`pillExpenseActive`/`pillIncomeActive`) y `app/reports.tsx` (`SEGMENT_COLORS`) definen los mismos 4 valores hardcodeados (`#FEE2E2`/`#E53E3E` rojo, `#DCFCE7`/`#16A34A` verde) en dos archivos distintos — copiados a mano al rediseñar el toggle de `reports.tsx` (2026-08-18) para que coincidiera visualmente con el Dashboard. No bloqueante, pero un cambio de paleta futuro obligaría a tocar ambos lugares; candidato a mover a `src/theme/tokens.ts` (`state.success`/`state.danger` ya existen mediante otro propósito — evaluar si aplican o si hace falta un par nuevo específico de gasto/ingreso).
- [x] ~~`.commit_msg.txt` reaparecía tracked en el repo (residuo del flujo `/commit` en PowerShell)~~ — eliminado del tracking y agregado a `.gitignore`
- [ ] **Sin keystore de producción**: `android/app/build.gradle` firma el build type `release` con `signingConfigs.debug` (`debug.keystore`, alias `androiddebugkey`) porque no existe una keystore de producción real ni `keystore.properties` en el repo (correcto que no esté versionado, pero tampoco existe localmente). Un APK "release" firmado con clave de debug dispara bloqueos de Google Play Protect ("App blocked to protect your device") al instalarlo manualmente en el dispositivo — confirmado 2026-07-13. Mientras tanto: instalar con `adb install -r` evita el bloqueo de Play Protect (no pasa por el Instalador de Paquetes del sistema). **Camino de resolución ya disponible (2026-08-14, sin ejecutar todavía)**: `npm run eas:prod` (ver Build variants más arriba) construye el variant `prod` vía EAS Build, que genera y gestiona su propia keystore de producción real de forma automática — no requiere `keytool` manual ni un config plugin nuevo. Pendiente: que el usuario decida ejecutar `eas login` + `npm run eas:prod` cuando quiera el primer release real firmado.

---

