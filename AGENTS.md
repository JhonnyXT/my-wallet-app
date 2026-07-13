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
Si hay conflictos de peer deps (React 19 vs librerías con peer React 18):
```bash
npm install --legacy-peer-deps
```

### Arrancar en desarrollo
```bash
npx expo start          # Metro bundler (escanea QR o presiona 'a' para Android)
npx expo run:android    # Build + ejecución directa en dispositivo/emulador
```

### Build de producción (APK release)
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

### Tests
No hay testing configurado. Deuda técnica documentada.

### Lint
No hay ESLint/Prettier configurado. Deuda técnica documentada.

---

## Onboarding del sistema de agentes IA

Este repositorio incluye un **sistema completo de agentes de IA** (compatible con Cursor, Claude Code y otros). Cualquier colaborador que clone el proyecto puede activar todo el contexto, las skills y los comandos personalizados con dos pasos:

### 1. Skills públicas — restaurar desde `skills-lock.json`

Las skills custom del proyecto están versionadas dentro de `.agents/skills/`. Las skills **públicas** (de terceros) no se versionan; se reinstalan desde el lockfile que sí está versionado:

```bash
npx skills install
```

Esto lee `skills-lock.json` (raíz del proyecto) y descarga las 6 skills públicas:
`systematic-debugging`, `react-native`, `expo-react-native-typescript`, `expo-react-native-performance`, `finishing-a-development-branch`, `test-driven-development`.

> Si tu CLI no soporta `install` desde lockfile, usa `npx skills add <fuente>/<skill>` para cada entry de `skills-lock.json`.

### 2. Cursor IDE — detección automática

Cursor detecta automáticamente al abrir el repositorio:
- `.cursor/rules/*.mdc` — se cargan según los `globs` de cada regla.
- `.cursor/commands/*.md` — se invocan escribiendo `/<nombre>` en el chat.
- `.cursor/agents/*.md` — disponibles como subagents (cuadro "Task" del agente).
- `AGENTS.md` — leído por el agente como guía maestra del repositorio.

No requiere configuración adicional. Solo asegúrate de tener Cursor actualizado.

### 2b. Claude Code — detección automática

Claude Code carga `CLAUDE.md` (raíz) automáticamente, que a su vez importa este mismo `AGENTS.md` completo. Además:
- `.claude/agents/*.md` — subagentes (`revisor-ui`, `auditor-deuda`, `generador-docs`), con `tools` explícitos.
- `.claude/commands/*.md` — slash commands, adaptados de `.cursor/commands/` (sin PowerShell, con rutas portables vía `$ANDROID_HOME`).
- `.agents/skills/*/SKILL.md` — las mismas skills que usa Cursor; Claude Code las lee del mismo lugar, no están duplicadas.

Las reglas `.cursor/rules/*.mdc` no se auto-cargan por `globs` en Claude Code (esa activación condicional es específica de Cursor) — se leen bajo demanda según la tabla en `CLAUDE.md`.

### 3. Comandos slash más usados

| Comando | Cuándo usarlo |
|---------|---------------|
| `/arrancar` | Build APK release + instala vía ADB (full deploy) |
| `/dev` | Build debug + hot reload (desarrollo iterativo) |
| `/build-apk` | Solo construye APK release sin instalar |
| `/revisar` | Validación pre-commit con `wallet-validator` |
| `/commit` | Commit inteligente con validación + actualización de docs |
| `/nuevo-componente` | Scaffold componente UI Stitch |
| `/nueva-pantalla` | Scaffold pantalla modal con registro |
| `/nuevo-feature` | Scaffold feature completo (pantalla + store + DB + componente) |

### 4. Subagentes disponibles

| Agente | Modo | Cuándo invocarlo |
|--------|------|------------------|
| `revisor-ui` | Solo lectura | Antes de mergear UI: audita tema, accesibilidad, consistencia visual |
| `auditor-deuda` | Solo lectura | Periódicamente: detecta código muerto, duplicaciones, deuda técnica |
| `generador-docs` | Lectura + escritura `.md` | Después de cambios estructurales: regenera AGENTS.md / CONTEXT.md |

### 5. Estructura del sistema (resumen)

```
.cursor/
  rules/      → 4 reglas con globs (siempre activas o por archivo)
  commands/   → 8 slash commands
  agents/     → 3 subagentes especializados
.agents/
  skills/     → 4 skills custom + 6 públicas (vía skills-lock.json)
AGENTS.md            → Este archivo (guía maestra)
CONTEXT.md           → Contexto técnico exhaustivo (~1100 líneas)
DOCUMENTATION.md     → Manual de usuario final
PRODUCT_REQUIREMENTS.md → Historias de usuario y requisitos
skills-lock.json     → Lockfile reproducible de skills públicas
```

> El detalle completo de cada archivo está en [Mapa de archivos de agentes](#mapa-de-archivos-de-agentes) al final.

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
| Testing | No configurado | — |
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
│   ├── active-expense.tsx            # Modal: nuevo gasto/ingreso
│   ├── category-onboarding.tsx       # Onboarding: selección de categorías
│   ├── notification-review.tsx       # Modal: revisión transacciones bancarias detectadas
│   ├── settings.tsx                  # Modal: configuración completa
│   ├── voice-input.tsx               # Modal: entrada por voz
│   └── voice-batch-review.tsx        # Modal: revisión lote multi-voz
│
├── src/
│   ├── components/ui/                # 17 componentes reutilizables
│   ├── components/chat/              # BoldText, WeeklySummaryCard, ChatMessageBubble, ChatHistoryDrawer, chatConstants
│   ├── components/dashboard/         # NotificationBadgeBtn, TransactionDetailModal
│   ├── constants/                    # categoryPresets, layout, theme (legacy), banks.ts
│   ├── context/ThemeContext.tsx       # Provider de tema light/dark
│   ├── db/                           # SQLite: db.ts (CRUD+indexes), queries.ts (agregados), chatDb.ts
│   ├── features/                     # chat/useLocalNLP.ts
│   ├── hooks/                        # useDashboardScroll, useDashboardSearch, useDashboardTotals, useDashboardTour, useTransactionFilters
│   ├── services/                     # notificationService.ts, notificationHeadlessTask.ts
│   ├── store/                        # 7 stores Zustand (useSettingsStore + useNotificationStore persistidos)
│   ├── theme/index.ts                # Tokens AppTheme: light + dark
│   ├── types/                        # chat.ts
│   └── utils/                        # formatMoney, nlp, voiceParser, notificationParser, colorUtils, tourRefs, chatHelpers, periodFilter, transactionFormatters
│
├── index.js                          # Entrypoint: registra HeadlessJS task + delega a expo-router/entry
├── android/                          # Proyecto Android nativo (Gradle, manifest, Kotlin)
├── CONTEXT.md                        # Ventana de contexto técnico completo (~1100 líneas)
├── DOCUMENTATION.md                  # Guía de usuario
└── PRODUCT_REQUIREMENTS.md           # Historias de usuario y requisitos
```

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
| `/category-onboarding` | `app/category-onboarding.tsx` | fade | Selección inicial de categorías |

---

## Stores Zustand

| Store | Persistido | Responsabilidad |
|-------|-----------|-----------------|
| `useFinanceStore` | No (cache SQLite) | Transacciones CRUD + batch |
| `useExpenseStore` | No | Formulario gasto/ingreso activo |
| `useSettingsStore` | AsyncStorage | Config: categorías, presupuesto, metas, métodos pago, dark mode, onboarding |
| `useVoiceStore` | No | Estado voz: transcript, pendingBatch, pendingManualItem |
| `useNotificationStore` | AsyncStorage | Cola transacciones detectadas desde notificaciones bancarias |
| `useUIStore` | No | Búsqueda (query, tags), filtro por categoría desde el chart, overlay de entrada rápida NLP |

---

## Reglas inmutables

1. **Offline-first**: cero llamadas a APIs externas. SQLite + AsyncStorage son las únicas fuentes de persistencia.
2. **Moneda COP**: formatear con regex `replace(/\B(?=(\d{3})+(?!\d))/g, ".")`. NUNCA `toLocaleString()`.
3. **Fechas locales**: usar `localISOString()` de `src/db/db.ts`. NUNCA `toISOString()`.
4. **Categorías dinámicas**: consultar `userCategories` del store antes de fallbacks legacy.
5. **No edición de transacciones**: solo crear y eliminar (decisión de diseño).
6. **Git manual**: nunca push automático.
7. **No datos bancarios sensibles**: nunca almacenar números de cuenta/tarjeta.
8. **Botón primario**: `#135BEC` fijo (no `t.accent`) para consistencia entre temas.

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
- `expo-sharing` está en dependencias pero NO se usa en código — se reemplazó por `Share` de react-native. No borrar porque `app.json` la tiene como plugin (B9).
- `expo-web-browser` y `expo-symbols` están en package.json pero sin imports directos; pueden ser requeridos transitivamente por Expo plugins — no eliminar sin auditoría de plugins (B13).
- `tsconfig.json` usa `paths: "@/*": ["./*"]` que mapea toda la raíz del proyecto. Suficiente para el setup de Expo Router; no restringir a `src/` sin verificar que no quiebra importaciones de `app/`, `assets/` etc. (B8).
- ~~`useVoiceExpense.ts` en `src/features/voice/` está roto y sin uso~~ — **resuelto**: eliminado (sin importadores, usaba `useUIStore.openExpenseInput` inexistente).
- ~~`ActionPills.tsx`, `CustomTabBar.tsx`, `AnimatedNumber.tsx` son componentes huérfanos~~ — **resuelto**: eliminados (verificado sin imports externos antes de borrar).
- ~~`AUTO_DETECT_ENABLED_KEY` y `ALLOWED_BANKS_KEY` duplicadas~~ — **resuelto**: consolidadas en `src/constants/banks.ts`, importadas desde `app/settings.tsx` y `src/services/notificationHeadlessTask.ts`.
- Configuración de detección automática usa `AsyncStorage` directamente (no `useSettingsStore`) para acceso desde HeadlessJS sin React.
- `notificationService.ts` tiene 3 canales Android (API 26+): `budget-alerts`, `goal-alerts`, `bank-transactions`. Llamar `initNotifications()` en el bootstrap de `_layout.tsx` garantiza que existan antes de cualquier notificación.
- `budgetNotifiedMonth` usa claves compuestas `"emoji:threshold"` / `"emoji:overspent"` para permitir 2 notificaciones por categoría por mes (al cruzar el umbral y al superar el 100%).
- Deep link desde notificación push: `data: { screen: "notification-review" }` → listener en `_layout.tsx` con `addNotificationResponseReceivedListener` y `getLastNotificationResponseAsync` (para app cerrada).
- **`Notifications.removeNotificationSubscription()` ya NO existe en `expo-notifications` (SDK 55)** — la API cambió: `addNotificationResponseReceivedListener()` devuelve un objeto `Subscription` con método propio `.remove()`. Usar `subscription.remove()` en el cleanup del `useEffect`, no la función estática antigua. Detectado por `tsc --noEmit` tras instalar dependencias (`app/_layout.tsx`), corregido en 2026-07-11.
- **Conflicto de manifest Android: `allowBackup` entre la app y `react-native-android-notification-listener`.** El template base de Expo/RN genera `android:allowBackup="true"` en `AndroidManifest.xml`, pero la librería de notificaciones fuerza `allowBackup="false"` en la suya — el manifest merger de Gradle falla si no se resuelve. Como `android/` está en `.gitignore` (se regenera con `expo prebuild`), cualquier fix manual directo sobre el manifest se pierde en el próximo prebuild. Se resolvió con un **config plugin local** (`plugins/withAllowBackupDisabled.js`, registrado en `app.json:plugins`) que fuerza `allowBackup="false"` — no `true`, porque es la opción más segura para una app que procesa texto de notificaciones bancarias (consistente con la Regla inmutable #7, no datos bancarios sensibles: no tiene sentido bloquear eso en la DB y dejar que el sistema los respalde a la nube). Este bug estaba latente sin detectar porque nadie había corrido `expo prebuild -p android` + build real en este repo antes (2026-07-13).
- **`src/utils/notificationParser.ts` ahora es una carpeta** (`src/utils/notificationParser/`), un módulo por responsabilidad: `types.ts`, `intentClassifier.ts` (clasifica `otp` / `security_alert` / `payment_reminder` / `marketing` / `app_update` / `possible_transaction` ANTES de intentar parsear nada — reemplaza el antiguo array plano `NOISE_PATTERNS`), `amountExtractor.ts`, `directionClassifier.ts`, `descriptionExtractor.ts`, `bankPatterns.ts` (un patrón por banco), `parseNotification.ts` (orquesta el pipeline, API pública) y `fixtures.ts` (casos reales/sintéticos con resultado esperado). El import externo `@/src/utils/notificationParser` sigue funcionando igual (resuelve a `index.ts`), ningún consumidor cambió.
  - Origen del refactor: Nu (y potencialmente cualquier banco) envía recordatorios de pago pendiente tipo "Tienes un pago por $X. Completa tu pago..." (ej. factura UNE-EPM aún no pagada) que antes se detectaban como gasto real solo por contener un monto y la palabra "pago". Ahora `intentClassifier` los clasifica como `payment_reminder` y se descartan antes de llegar a `bankPatterns`, para los 15 bancos de la whitelist, no solo Nu.
  - Al agregar un patrón nuevo: sumar el caso a `fixtures.ts` primero (con el resultado esperado), después ajustar `intentClassifier`/`bankPatterns`, y volver a verificar contra todos los fixtures — así un ajuste para un banco no rompe silenciosamente un caso ya resuelto de otro.
  - `notifyBankTransaction()` (`src/services/notificationService.ts`) ahora recibe `confidence` y redacta el título/cuerpo distinto: `high` → "detectado" (asertivo); `medium`/`low` → "¿...?" (a confirmar). En ambos casos el item solo se guarda en el historial si el usuario lo confirma manualmente en `notification-review.tsx` — la notificación push nunca escribe en la base de datos por sí sola.
- **La detección automática en background puede detenerse por gestión de batería del fabricante (Samsung/Xiaomi/Huawei...), no por un bug de la app.** `RNAndroidNotificationListener` es un `NotificationListenerService` estándar de Android, pero OneUI/MIUI/EMUI matan procesos en background agresivamente igual, y Android debe re-crear el proceso completo (evaluando todo `index.js` + `expo-router/entry`) para procesar la siguiente notificación — con el timeout de 15s de `HeadlessJsTaskService` (librería nativa, no configurable desde JS) esto puede fallar en cold-starts lentos. `app/settings.tsx` (sección `AutoDetectSection`) ahora muestra una tarjeta con botón "Abrir ajustes de batería" (`Linking.openSettings()`, sin pedir el permiso especial `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` para no arriesgar rechazo en Play Store) cuando la detección está activa. Recordar también: **reinstalar la app revoca el permiso de "Acceso a notificaciones"** — hay que volver a concederlo manualmente tras cada reinstalación, no es un bug.
- Filtro por categoría: tap corto en columna del `CategoryChart` activa `useUIStore.setCategoryFilter`. Se limpia con back físico (`BackHandler`) o con un gesto de pull-down implementado a mano vía `PanResponder` (NO `RefreshControl`, para no mostrar spinner de recarga).
- Long-press en `CategoryChart` usa un `consumedRef` para evitar que `onTouchEnd` dispare el tap (filtro) después de que `onPanResponderRelease` ya consumió el gesto. Esta race condition existía en versiones previas y debe preservarse el flag al modificar el componente.
- No usar toasts in-app: el sistema de toasts (`useToastStore`, `ToastContainer`, `ToastBanner`) fue eliminado. Errores críticos usan `Alert.alert`; eventos importantes (presupuesto, transacción detectada, meta cumplida) usan notificaciones push del sistema.
- `reset()` en `useVoiceStore` debe llamarse ANTES de `setPendingBatch()` — si se invierte el orden, el batch se pierde.
- El APK de release usa `signingConfigs.release` con keystore externo (`keystore.properties`). Para builds de producción real, crear el keystore con `keytool` y rellenar `keystore.properties` (ver `keystore.properties.template`).

---

## Deuda técnica documentada

- [ ] Sin framework de testing (ni Jest ni Vitest) — pendiente, próxima iteración. `src/utils/notificationParser/fixtures.ts` ya tiene casos reales con resultado esperado, listos para envolverse en `it()`/`test()` uno a uno apenas se instale el runner.
- [ ] Sin ESLint ni Prettier configurados
- [x] ~~3 componentes huérfanos: `ActionPills`, `CustomTabBar`, `AnimatedNumber`~~ — eliminados
- [x] ~~Hook muerto: `src/features/voice/useVoiceExpense.ts`~~ — eliminado
- [x] ~~Constantes AsyncStorage duplicadas (settings.tsx + notificationHeadlessTask.ts)~~ — consolidadas en `src/constants/banks.ts`
- [ ] Dependencias posiblemente no usadas: `expo-web-browser`, `expo-symbols` (ver nota B13 arriba)
- [ ] Varios `as any` localizados (SpeechModule types, estilos porcentuales Reanimated)
- [x] ~~`.commit_msg.txt` reaparecía tracked en el repo (residuo del flujo `/commit` en PowerShell)~~ — eliminado del tracking y agregado a `.gitignore`

---

## Mapa de archivos de agentes

### Rules (`.cursor/rules/`)

| Archivo | Activación | Descripción |
|---------|-----------|-------------|
| `project-conventions.mdc` | `alwaysApply: true` | Restricciones globales inmutables: COP, offline, arquitectura |
| `database.mdc` | `src/db/**` | Convenciones SQLite, WAL, fechas ISO, migraciones |
| `ui-components.mdc` | `**/*.tsx` | Stitch Design, tema dinámico, animaciones, checklist |
| `typescript-strict.mdc` | `**/*.ts, **/*.tsx` | TypeScript strict, patrones Zustand, exports, imports |

### Skills custom (`.agents/skills/`)

| Skill | Propósito |
|-------|----------|
| `add-screen` | Scaffold nueva pantalla Expo Router con tema y registro en _layout |
| `add-component` | Scaffold nuevo componente UI Stitch con dark mode |
| `debug-react-native` | Debugging por capas: SQLite → Zustand → Router → UI → Build → Notificaciones |
| `wallet-validator` | Validación pre-commit (12 checks) basada en reglas del proyecto |

### Skills públicas (`.agents/skills/`)

| Skill | Fuente | Propósito |
|-------|--------|----------|
| `systematic-debugging` | obra/superpowers | Debugging genérico avanzado |
| `react-native` | jezweb/claude-skills | Best practices React Native |
| `expo-react-native-typescript` | mindrally/skills | Expo + RN + TypeScript |
| `expo-react-native-performance` | pproenca/dot-skills | Optimización de rendimiento RN |
| `finishing-a-development-branch` | obra/superpowers | Workflow para cerrar branches |
| `test-driven-development` | obra/superpowers | TDD para cuando se agreguen tests |

### Commands (`.cursor/commands/`)

| Comando | Descripción |
|---------|-------------|
| `/arrancar` | Build APK release + instalación por ADB en dispositivo conectado |
| `/revisar` | Validación técnica completa (lint + wallet-validator) |
| `/commit` | Commit inteligente con validación previa |
| `/nuevo-componente` | Scaffold componente UI Stitch |
| `/nueva-pantalla` | Scaffold pantalla modal con registro |
| `/nuevo-feature` | Scaffold módulo completo (pantalla + store + DB + componente) |
| `/build-apk` | Build release + instalación por ADB |

### Subagents (`.cursor/agents/`)

| Agente | Modo | Propósito |
|--------|------|----------|
| `revisor-ui` | Solo lectura | Audita consistencia visual, dark mode, accesibilidad |
| `auditor-deuda` | Solo lectura | Identifica deuda técnica, código muerto, duplicaciones |
| `generador-docs` | Lectura + escritura .md | Actualiza AGENTS.md, CONTEXT.md, DOCUMENTATION.md |

### Equivalente para Claude Code

| Ruta | Qué es | Relación con lo de Cursor |
|------|--------|---------------------------|
| `CLAUDE.md` (raíz) | Punto de entrada que Claude Code auto-carga | Importa este mismo `AGENTS.md` con `@AGENTS.md` |
| `.claude/agents/*.md` | Subagentes (mismos 3 roles) | Adaptados de `.cursor/agents/`, con `tools:` explícitos (`Read, Grep, Glob` para los de solo lectura) |
| `.claude/commands/*.md` | Slash commands (mismos 8) | Adaptados de `.cursor/commands/`, sin PowerShell/rutas de usuario hardcodeadas — usan `$ANDROID_HOME` y bash |
| `.agents/skills/*/SKILL.md` | Skills custom | Compartidas tal cual, sin duplicar — ya estaban en formato compatible |

Mantener ambos sistemas (`.cursor/` y `.claude/`) sincronizados manualmente: un cambio de convención en uno debe reflejarse en el otro.
