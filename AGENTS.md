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

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Lenguaje | TypeScript (strict: true) | ~5.9.2 |
| Framework | React Native + Expo | 0.83.2 / SDK 55 |
| Bundler | Metro (Expo) | Default Expo 55 |
| Estilos | NativeWind (Tailwind) + StyleSheet.create | ^4.2.2 |
| Componentes UI | Propios (`src/components/ui/`) + lucide-react-native | ^0.576.0 |
| Routing | Expo Router (file-based, Stack + Tabs) | ~55.0.3 |
| Estado | Zustand (7 stores, 1 persistido con AsyncStorage) | ^5.0.11 |
| HTTP/Fetch | N/A (100% offline) | — |
| Base de datos | expo-sqlite (WAL mode) | ^55.0.10 |
| ORM | Sin ORM (SQL directo con placeholders) | — |
| Auth | N/A (app local, sin servidor) | — |
| Testing | No configurado | — |
| Package manager | npm | — |
| CI/CD | GitHub Actions (EAS Build/Update, workflow_dispatch) | — |
| Notificaciones push | react-native-android-notification-listener (HeadlessJS) | ^5.0.1 |

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
│   ├── constants/                    # categoryPresets, layout, theme (legacy)
│   ├── context/ThemeContext.tsx       # Provider de tema light/dark
│   ├── db/                           # SQLite: db.ts (CRUD), queries.ts (agregados), chatDb.ts
│   ├── features/                     # voice/useVoiceExpense.ts, chat/useLocalNLP.ts
│   ├── services/                     # notificationService.ts, notificationHeadlessTask.ts
│   ├── store/                        # 7 stores Zustand
│   ├── theme/index.ts                # Tokens AppTheme: light + dark
│   └── utils/                        # formatMoney, nlp, voiceParser, notificationParser, colorUtils, tourRefs
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
| `useNotificationStore` | No (memoria) | Cola transacciones detectadas desde notificaciones bancarias |
| `useToastStore` | No | Cola global toasts in-app (máx 3) |
| `useUIStore` | No | Búsqueda: query, tags activos |

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
| Constantes | UPPER_SNAKE | `MAX_TOASTS`, `DEFAULTS` |
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
- `useVoiceExpense.ts` en `src/features/voice/` está **roto y sin uso** — usa `useUIStore.openExpenseInput` que no existe. Es código muerto.
- `ActionPills.tsx`, `CustomTabBar.tsx`, `AnimatedNumber.tsx` son componentes huérfanos (sin imports). `AnimatedNumber` está marcado como legado en las reglas UI.
- `AUTO_DETECT_ENABLED_KEY` y `ALLOWED_BANKS_KEY` están duplicadas en `app/settings.tsx` y `src/services/notificationHeadlessTask.ts`.
- Configuración de detección automática usa `AsyncStorage` directamente (no `useSettingsStore`) para acceso desde HeadlessJS sin React.
- `reset()` en `useVoiceStore` debe llamarse ANTES de `setPendingBatch()` — si se invierte el orden, el batch se pierde.
- El APK de release usa `signingConfig signingConfigs.debug` (debug keystore) — para producción real hay que generar keystore propio.

---

## Deuda técnica documentada

- [ ] Sin framework de testing (ni Jest ni Vitest)
- [ ] Sin ESLint ni Prettier configurados
- [ ] 3 componentes huérfanos: `ActionPills`, `CustomTabBar`, `AnimatedNumber`
- [ ] Hook muerto: `src/features/voice/useVoiceExpense.ts`
- [ ] Constantes AsyncStorage duplicadas (settings.tsx + notificationHeadlessTask.ts)
- [ ] Dependencias posiblemente no usadas: `expo-web-browser`, `expo-symbols` (ver nota B13 arriba)
- [ ] Varios `as any` localizados (SpeechModule types, estilos porcentuales Reanimated)
- [ ] APK release firmado con debug keystore
- [ ] `catch {}` vacíos en db.ts (migraciones), headless task, voice-input

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
| `/arrancar` | Instala deps y lanza dev server completo |
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
