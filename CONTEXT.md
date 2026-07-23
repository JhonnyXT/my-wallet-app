# MyWallet — Ventana de Contexto del Proyecto

> **Propósito:** Este documento es la referencia técnica completa del proyecto. Cualquier desarrollador, IA o colaborador que lea este archivo tendrá TODO el contexto necesario para desarrollar, modificar o extender la aplicación sin perder consistencia.
>
> **Última actualización:** 2026-07-22 | **Versión:** 1.5.0

---

## Índice

1. [Visión del Producto](#1-visión-del-producto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Arquitectura de la Aplicación](#4-arquitectura-de-la-aplicación)
5. [Sistema de Navegación](#5-sistema-de-navegación)
6. [Estado Global (Zustand Stores)](#6-estado-global-zustand-stores)
7. [Base de Datos (SQLite)](#7-base-de-datos-sqlite)
8. [Sistema de Temas (Light / Dark)](#8-sistema-de-temas-light--dark)
9. [Sistema NLP (Procesamiento de Lenguaje Natural)](#9-sistema-nlp-procesamiento-de-lenguaje-natural)
10. [Categorías (Sistema Dinámico)](#10-categorías-sistema-dinámico)
11. [Componentes UI Reutilizables](#11-componentes-ui-reutilizables)
12. [Pantallas y Rutas](#12-pantallas-y-rutas)
13. [Formato de Moneda (COP)](#13-formato-de-moneda-cop)
14. [Animaciones y Micro-interacciones](#14-animaciones-y-micro-interacciones)
15. [Convenciones de Código](#15-convenciones-de-código)
16. [Mejores Prácticas Adoptadas](#16-mejores-prácticas-adoptadas)
17. [CI/CD y Despliegue](#17-cicd-y-despliegue)
18. [Problemas Conocidos y Deuda Técnica](#18-problemas-conocidos-y-deuda-técnica)
19. [Reglas para Futuro Desarrollo](#19-reglas-para-futuro-desarrollo)
20. [Dependencias Completas](#20-dependencias-completas)

---

## 1. Visión del Producto

**MyWallet** es una aplicación personal de control financiero diseñada bajo el principio de **"Minimalismo Funcional"** y **"Cero Fricción"**:

- **Registro en un corto tiempo** mediante texto libre con NLP o entrada por voz
- **100% offline** — datos locales en SQLite, sin servidores ni suscripciones
- **Moneda:** Pesos colombianos ($ COP), separador de miles con puntos
- **Idioma UI:** Español (todo texto visible al usuario debe estar en español)
- **Plataforma objetivo:** Android (iOS en desarrollo)
- **Inspiración:** MonAI + Google Stitch Design System

### Filosofía de Diseño

- Interfaz limpia y profesional con espacio negativo generoso (24-32px padding)
- Tipografía geométrica sans-serif (Inter) con pesos gruesos para montos
- Emojis nativos del sistema para categorías
- Micro-interacciones fluidas (haptics + spring animations)
- Modo oscuro completo en todas las pantallas

---

## 2. Stack Tecnológico

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| **React Native** | 0.83.2 | Framework base (New Architecture obligatorio) |
| **Expo** | SDK 55 | Plataforma de desarrollo (Managed Workflow) |
| **Expo Router** | ~55.0.3 | Navegación file-based con Stack + Tabs |
| **TypeScript** | ~5.9.2 | Tipado estricto (`strict: true`) |
| **Zustand** | ^5.0.11 | Estado global (6 stores, 2 persistidos) |
| **expo-sqlite** | ^55.0.10 | Base de datos local con WAL |
| **NativeWind** | ^4.2.2 | Estilos Tailwind CSS para React Native |
| **React Native Reanimated** | ^4.2.1 | Animaciones de alto rendimiento |
| **expo-notifications** | ~55.0.13 | Notificaciones locales del sistema (OS) |
| **lucide-react-native** | ^0.576.0 | Iconografía (línea, 24px stroke) |
| **expo-speech-recognition** | ^3.1.1 | Reconocimiento de voz local |
| **expo-haptics** | ^55.0.8 | Feedback háptico |
| **expo-blur** | ~55.0.8 | Efectos de desenfoque |
| **expo-linear-gradient** | ~55.0.8 | Gradientes |
| **AsyncStorage** | ^2.2.0 | Persistencia de configuración de usuario |
| **react-native-svg** | ^15.15.3 | Gráficos SVG (tarjetas semanales) |
| **react-native-android-notification-listener** | ^5.0.1 | Captura de notificaciones push bancarias en background (Android) |

### Configuración Clave

- **Babel:** `babel-preset-expo` con `jsxImportSource: "nativewind"` + `react-native-reanimated/plugin` (siempre último)
- **Metro:** config extendida con `withNativeWind` y `global.css`
- **TypeScript paths:** `@/*` → raíz del proyecto
- **EAS:** Perfiles `development` (APK dev), `preview` (APK interno), `production` (autoIncrement)

---

## 3. Estructura del Proyecto

```
my-wallet-app/
├── app/                          # Rutas (Expo Router)
│   ├── _layout.tsx               # Root: ThemeProvider, initDB, Stack
│   ├── +not-found.tsx            # 404
│   ├── active-expense.tsx        # Modal: nuevo gasto/ingreso
│   ├── settings.tsx              # Modal: configuración (incluye sección Detección automática)
│   ├── voice-input.tsx           # Modal: entrada por voz
│   ├── voice-batch-review.tsx    # Modal: revisión de transacciones multi-voz
│   ├── notification-review.tsx   # Modal: revisión de transacciones detectadas desde notificaciones bancarias
│   └── (tabs)/
│       ├── _layout.tsx           # Tabs (barra oculta) + FloatingDock
│       ├── index.tsx             # Dashboard principal (con badge de notificaciones bancarias)
│       └── wallet.tsx            # Placeholder (href: null)
│
├── src/                          # Lógica y componentes
│   ├── components/ui/            # Componentes reutilizables
│   │   ├── AnimatedSplash.tsx    # Splash animado (icono + texto) al arrancar, usado en app/_layout.tsx
│   │   ├── BudgetBar.tsx         # Barra de progreso presupuesto
│   │   ├── CategoryChart.tsx     # Gráfica de categorías (barras + animaciones scroll)
│   │   ├── ConfirmDialog.tsx     # Diálogo de confirmación reutilizable (danger/warning/info)
│   │   ├── GuidedTour.tsx        # Overlay de onboarding paso a paso con spotlight
│   │   ├── FilterChips.tsx       # Chip de período + "Elegir mes específico"
│   │   ├── FloatingDock.tsx      # Dock flotante + FAB micrófono
│   │   ├── FloatingInput.tsx     # Overlay input/búsqueda flotante
│   │   ├── MonthPickerModal.tsx  # Selector de mes/año con montos
│   │   ├── HueColorPicker.tsx    # Slider continuo de tono (PanResponder + LinearGradient) para categorías
│   │   ├── RollingNumber.tsx     # Odómetro por dígito (Reanimated) — usado en Dashboard
│   │   └── TransactionItem.tsx   # Item transacción + swipe-delete + tap-to-detail
│   │
│   ├── constants/
│   │   ├── categoryPresets.ts    # UserCategory, presets, paleta colores, emojis curados
│   │   ├── layout.ts             # DOCK_HEIGHT, scrollBottomPadding
│   │   └── theme.ts              # COLORS, CATEGORY_MAP (legacy), getCategoryColor/Name
│   │
│   ├── context/
│   │   └── ThemeContext.tsx       # Proveedor de tema claro/oscuro
│   │
│   ├── db/
│   │   ├── db.ts                 # SQLite: transactions, CRUD
│   │   └── queries.ts            # Consultas agregadas (totales, stats)
│   │
│   ├── features/
│   │   └── chat/useLocalNLP.ts   # Hook de NLP local para el chat experimental
│   │
│   ├── services/
│   │   ├── notificationService.ts       # Notificaciones OS locales (expo-notifications): permisos, budget, metas
│   │   └── notificationHeadlessTask.ts  # HeadlessJS task: procesa notif. bancarias en background
│   │
│   ├── store/
│   │   ├── useFinanceStore.ts       # Transacciones (Zustand + SQLite)
│   │   ├── useExpenseStore.ts       # Formulario gasto/ingreso en curso
│   │   ├── useNotificationStore.ts  # Cola persistida (AsyncStorage) de transacciones detectadas de notificaciones bancarias
│   │   ├── useSettingsStore.ts      # Config usuario (persist AsyncStorage) + flags de notificaciones
│   │   │   └── slices/               # 6 slices por dominio: categories, budget, payments, goals, prefs, notifications
│   │   ├── useUIStore.ts            # Estado de UI (búsqueda, filtro por categoría, overlay NLP)
│   │   └── useVoiceStore.ts         # Estado de reconocimiento de voz
│   │
│   ├── theme/
│   │   └── index.ts              # AppTheme: light y dark token objects
│   │
│   └── utils/
│       ├── colorUtils.ts           # hueToColors, hslToHex, hexToHsl, hexToHue — conversiones HSL↔Hex
│       ├── formatMoney.ts          # formatMoneyInput, formatMoneyDisplay, formatCOP
│       ├── fuzzyMatch.ts           # levenshtein, fuzzyIncludes — tolerancia a typos en NLP de voz/texto
│       ├── nlp.ts                  # parseExpenseInput (texto rápido)
│       ├── notificationParser/     # Parser de notificaciones bancarias (carpeta, un módulo por responsabilidad — ver sección 9b)
│       ├── tourRefs.ts             # Registro global de refs para el GuidedTour (getTourRef, TOUR_KEYS)
│       └── voiceParser.ts          # Parseo de transcripción de voz
│
├── index.js                      # Entrypoint: registra HeadlessJS task + delega a expo-router/entry
├── assets/images/                # Iconos, splash, favicon
├── docs/                         # Sitio estático GitHub Pages: index.html (landing), privacy-policy.html, icon.png, favicon.png
├── .github/workflows/            # CI: eas-build.yml, eas-update.yml
├── DOCUMENTATION.md              # Guía de usuario
├── PRODUCT_REQUIREMENTS.md       # MVP: visión, historias, estilo
├── CONTEXT.md                    # ← ESTE ARCHIVO
└── [configs]                     # package.json, tsconfig, babel, metro, eas, tailwind
```

---

## 4. Arquitectura de la Aplicación

### Patrón: Feature-Sliced Simplificado

```
┌─────────────────────────────────────────────────────────┐
│  app/ (Rutas — Expo Router)                              │
│  Cada archivo .tsx = una pantalla o modal                 │
│  Solo orquesta: lee stores, llama utils, renderiza UI    │
├─────────────────────────────────────────────────────────┤
│  src/store/ (Estado Global — Zustand)                    │
│  6 stores independientes, 2 con persist(AsyncStorage)    │
├─────────────────────────────────────────────────────────┤
│  src/db/ (Persistencia — SQLite)                         │
│  Capa de datos pura, sin lógica de negocio               │
├─────────────────────────────────────────────────────────┤
│  src/features/ (Lógica de dominio)                       │
│  NLP local, integración de voz                           │
├─────────────────────────────────────────────────────────┤
│  src/hooks/ (Hooks de dominio para pantallas)            │
│  useDashboardScroll, useDashboardSearch,                 │
│  useDashboardTotals, useDashboardTour,                   │
│  useTransactionFilters                                   │
├─────────────────────────────────────────────────────────┤
│  src/components/ui/ (Componentes reutilizables)          │
│  Agnósticos a la pantalla, reciben props                 │
├─────────────────────────────────────────────────────────┤
│  src/components/chat/ (Componentes del chat)             │
│  BoldText, WeeklySummaryCard, ChatMessageBubble,         │
│  ChatHistoryDrawer, chatConstants                        │
├─────────────────────────────────────────────────────────┤
│  src/components/dashboard/ (Componentes del dashboard)   │
│  NotificationBadgeBtn, TransactionDetailModal            │
├─────────────────────────────────────────────────────────┤
│  src/utils/ (Utilidades puras)                           │
│  Formateo, parseo, sin side effects                      │
├─────────────────────────────────────────────────────────┤
│  src/types/ (Tipos compartidos entre features)           │
│  chat.ts                                                 │
├─────────────────────────────────────────────────────────┤
│  src/constants/ + src/theme/ (Configuración estática)    │
│  Colores, categorías, banks.ts, layout, tokens de tema   │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
Usuario → Pantalla (app/) → Store (Zustand) → DB (SQLite)
                ↓                    ↑
         Componentes UI ←── Theme Context
                ↓
         Utils (formateo, NLP)
```

### Principios Arquitectónicos

1. **Separación de responsabilidades:** Las pantallas (`app/`) solo orquestan. La lógica vive en `store/`, `features/`, `utils/`
2. **Store por dominio:** Cada store maneja un solo aspecto (finanzas, formulario, settings, UI, voz)
3. **DB como fuente de verdad:** Las transacciones viven en SQLite; el store de finanzas las carga en memoria para rendimiento
4. **Tema por contexto:** `ThemeContext` distribuye tokens de color; los estilos se generan con `useMemo` + funciones `buildStyles(theme)`
5. **Sin APIs externas:** Todo funciona offline (NLP, voz, cálculos)

---

## 5. Sistema de Navegación

### Stack Principal (`app/_layout.tsx`)

```
Stack
├── (tabs)              → Tab layout (barra oculta)
│   ├── index           → Dashboard
│   └── wallet          → Placeholder (href: null, invisible)
│
├── voice-input              → Modal slide_from_bottom
├── voice-batch-review       → Modal slide_from_bottom (revisión de lote multi-voz)
├── notification-review      → Modal slide_from_bottom (revisión de transacciones detectadas de notif. bancarias)
├── active-expense           → Modal slide_from_bottom
├── settings                 → Modal slide_from_bottom
└── +not-found               → 404
```

### Dock Flotante (FloatingDock)

El dock reemplaza la barra de tabs nativa. Contiene:
- Botón **+** → Menú popup (Gasto/Ingreso) → navega a `active-expense`
- **Lupa** → activa modo búsqueda en `FloatingInputOverlay`
- **Micrófono FAB** → navega a `voice-input`

### Modales

Todos los modales usan `presentation: "modal"` con `animation: "slide_from_bottom"` y `headerShown: false`. El contenido dentro maneja su propia cabecera.

---

## 6. Estado Global (Zustand Stores)

### useFinanceStore (no persistido)
```typescript
{
  transactions: TransactionRow[]    // Cargadas desde SQLite al inicio
  isLoading: boolean
  loadTransactions(): Promise<void> // Lee SQLite → actualiza array
  addTransaction(...): Promise<TransactionRow>
  deleteTransaction(id): Promise<void>
  getTotalBalance(): number         // Suma de todos los amounts
  addTransactionBatch(items: BatchTransactionItem[]): Promise<number[]> // Inserta múltiples transacciones de forma secuencial; retorna los IDs para "Deshacer todo"
}

interface BatchTransactionItem {
  amount: number          // Positivo = gasto, negativo = ingreso
  description: string
  categoryEmoji: string
  tags?: string[]
  date?: string
  paymentMethod?: string
}
```
**Patrón:** SQLite es la fuente de verdad. El store es un cache en memoria. `addTransactionBatch` usa un loop secuencial (`for...of`) para evitar bloqueos concurrentes de SQLite, y llama `getAllTransactions()` una sola vez al terminar para eficiencia.

### useExpenseStore (no persistido)
```typescript
interface ActiveExpense {
  amount: number
  isExpense: boolean
  categoryEmoji: string             // Emoji de la categoría (ej: "🍔")
  categoryName: string
  date: "today" | "custom"
  customDate: Date | null
  note: string
  rawTranscript: string
  account: "cash" | "savings" | "credit"
  tags: string[]
}
```
**Patrón:** Estado efímero del formulario en curso. Se resetea al guardar/cerrar.

### useSettingsStore (persistido en AsyncStorage)
Internamente organizado en 6 slices por dominio en `src/store/slices/` (`categoriesSlice`,
`budgetSlice`, `paymentsSlice`, `goalsSlice`, `prefsSlice`, `notificationsSlice`), combinados en un
único store con `SettingsState = CategoriesSlice & BudgetSlice & PaymentsSlice & GoalsSlice & PrefsSlice & NotificationsSlice`.
La API pública es idéntica a la de un store plano — ningún importador externo cambia.
```typescript
{
  userName: string
  monthlyBudget: number             // 0 = no configurado
  budgetByCategory: Record<string, number>  // emoji → monto límite
  paymentMethods: PaymentMethod[]
  savingsGoals: SavingsGoal[]
  darkMode: "system" | "light" | "dark"
  hasCompletedOnboarding: boolean   // true tras completar o saltar el Guided Tour
  onboardingStep: number            // paso actual del tour (0-4)
  notificationsEnabled: boolean     // si el usuario concedió permiso de notificaciones OS
  budgetNotifiedMonth: Record<string, string>  // "emoji:threshold"|"emoji:overspent" → "YYYY-MM" — 2 niveles de notif. por cat./mes
  goalNotifiedIds: string[]         // IDs de metas ya notificadas — anti-duplicación
}

// Acciones
setOnboardingStep(step: number): void
completeOnboarding(): void
setNotificationsEnabled(val: boolean): void
markBudgetNotified(emoji: string): void
markGoalNotified(id: string): void
clearExpiredBudgetNotifications(): void  // limpia entradas de meses anteriores al arrancar la app
```

El presupuesto es siempre mensual. No existen helpers de período — los montos se usan directamente.

**Persistencia:** `zustand/middleware/persist` con `createJSONStorage(() => AsyncStorage)`, key `"mywallet-settings"`. Los campos `hasCompletedOnboarding` y `onboardingStep` también se persisten.

### useUIStore (no persistido)
Estado de UI global: búsqueda (searchOpen, searchQuery, activeTags), filtro por categoría desde el chart (categoryFilter) y overlay de entrada rápida NLP (isExpenseInputOpen, prefillText). Acciones principales: setSearchOpen(), closeSearch(), setCategoryFilter(filter), clearCategoryFilter(), openExpenseInput(prefill?), closeExpenseInput().
```typescript
{
  searchOpen: boolean
  searchQuery: string
  activeTags: string[]
  categoryFilter: { emoji: string; name: string } | null  // tap corto en columna del chart lo activa
  isExpenseInputOpen: boolean
  prefillText: string
}
```
> Cuando `categoryFilter` está activo, el Dashboard oculta la gráfica y muestra solo las transacciones de esa categoría con un chip informativo. Se limpia con back físico o pull-down (`PanResponder` custom, ver sección Dashboard).

### PeriodFilter (tipo local del Dashboard)
```typescript
type PeriodFilter =
  | { type: "quick"; label: string }   // "Hoy", "Esta semana", "Este mes", etc.
  | { type: "month"; year: number; month: number }  // Mes específico
  | { type: "year";  year: number }     // Año completo
  | { type: "all" };                    // Sin filtro de fecha
```
Reemplaza los estados separados `period` + `pickerYear` + `pickerMonth`. Vive en `app/(tabs)/index.tsx`.

### useVoiceStore (no persistido)
```typescript
{
  status: "idle" | "listening" | "processing" | "error"
  transcript: string
  finalTranscript: string
  errorMessage: string | null
  pendingBatch: PendingTransaction[] | null  // transacciones multi-voz esperando revisión
  pendingManualItem: ManualAddItem | null    // registro manual que viene de active-expense (from=batch-review)
}

// PendingTransaction = tipo inferido de processMultiVoiceInput (transactions[number])
// ManualAddItem = { amount, description, categoryEmoji, categoryName, isExpense, paymentMethod }

// Acciones
setPendingBatch(items: PendingTransaction[]): void
clearPendingBatch(): void
setPendingManualItem(item: ManualAddItem): void
clearPendingManualItem(): void
reset(): void  // limpia todo incluyendo pendingBatch y pendingManualItem
```
**Patrón de pendingManualItem:** cuando `active-expense` se abre con el param `?from=batch-review`, al confirmar la transacción en lugar de guardar en DB llama `setPendingManualItem(...)` y hace `router.back()`. `voice-batch-review` lo recoge con `useFocusEffect` al recuperar el foco, lo agrega como tarjeta y llama `clearPendingManualItem()`.

### useNotificationStore (persistido con AsyncStorage — clave: "notification-pending-queue")
```typescript
{
  pendingItems: PendingNotificationItem[]  // cola de transacciones detectadas desde notificaciones bancarias
}

// PendingNotificationItem extiende ParsedTransaction + { id: string }
// ParsedTransaction = { amount, isExpense, description, bankName, packageName,
//                       rawTitle, rawText, confidence: "high"|"medium"|"low", detectedAt }

// Acciones
addPendingItem(item: ParsedTransaction): void   // agrega a la cola, evita duplicados (<2 min mismo banco+monto)
removePendingItem(id: string): void
clearAll(): void
```
**Importante:** Este store **sí se persiste** en AsyncStorage (`persist` + `partialize` sobre `pendingItems`, clave `"notification-pending-queue"`), justamente para sobrevivir cold starts: cuando el HeadlessJS task detecta una transacción con la app cerrada, el item sigue disponible al abrirla. Lo que nunca ocurre automáticamente es la escritura en la base de datos — un item solo pasa a `transactions` si el usuario lo confirma en `notification-review.tsx`.

### Regla crítica de stores
- **NUNCA** mezclar lógica de servidor/API en los stores (la app es offline)
- **NUNCA** almacenar datos financieros sensibles (números de cuenta/tarjeta) en los stores
- Usar selectores específicos para evitar re-renders innecesarios

---

## 7. Base de Datos (SQLite)

### Archivo: `mywallet.db` (WAL mode)

#### Tabla `transactions`
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  amount          REAL NOT NULL,        -- Positivo = gasto, Negativo = ingreso
  description     TEXT NOT NULL,        -- Texto libre del usuario
  category_emoji  TEXT NOT NULL DEFAULT '💰',
  date            TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  tags            TEXT NOT NULL DEFAULT '',  -- JSON: '["#trabajo","#comida"]'
  payment_method  TEXT NOT NULL DEFAULT 'cash'
);
```

**Convención de signos:**
- `amount > 0` → **Gasto**
- `amount < 0` → **Ingreso**
- Balance neto = `SUM(amount)` donde negativo es positivo para el usuario

### Operaciones disponibles (db.ts)
| Función | Descripción |
|---------|-------------|
| `initDatabase()` | Crea tabla + migración de `tags` |
| `insertTransaction(amount, desc, emoji, tags, date?, paymentMethod?)` | INSERT con fecha local ISO |
| `deleteTransaction(id)` | DELETE por ID |
| `getAllTransactions()` | SELECT * ORDER BY date DESC |
| `hasAnyTransactions()` | COUNT > 0 |
| `clearTransactions()` | DELETE ALL |
| `getMonthlyTotal()` | SUM del mes actual |

### Operaciones de consulta (queries.ts)
| Función | Descripción |
|---------|-------------|
| `queryMonthTotal(month, year)` | Total de un mes específico |
| `queryYearTotal(year)` | Total del año |
| `queryTodayTotal()` | Total de hoy |
| `queryYesterdayTotal()` | Total de ayer |
| `queryLastNTransactions(n)` | Últimas N transacciones |
| `queryMaxTransaction()` | Transacción de mayor monto |
| `queryWeeklyTotals()` | Totales por día de la semana actual |
| `queryPrevWeekTotal()` | Total semana anterior |
| `queryMonthlyExpensesByYear(year)` | Mapa `{mes: totalGastos}` para los 12 meses de un año (query única con GROUP BY) |
| `queryFirstTransactionYear()` | Año de la primera transacción registrada (para pills de año dinámicos) |

### Reglas de base de datos
- Siempre usar `localISOString()` para fechas (evita desfase UTC)
- WAL mode está habilitado en `initDatabase()`
- Las migraciones se hacen con `ALTER TABLE ... ADD COLUMN` envuelto en try/catch
- NUNCA almacenar datos bancarios reales en la DB

---

## 8. Sistema de Temas (Light / Dark)

### Tokens de Tema (`src/theme/index.ts`)

```typescript
type AppTheme = {
  isDark: boolean
  bg: string           // Fondo principal
  surface: string      // Tarjetas / modales
  border: string       // Bordes / separadores
  text: string         // Texto principal
  textSub: string      // Texto secundario
  textTertiary: string // Texto muy suave
  itemBg: string       // Fondo de items
  pillNeutral: string  // Fondo de pills
  inputBg: string      // Fondo de inputs
  accent: string       // Color primario
  statusBar: "dark-content" | "light-content"
}
```

| Token | Light | Dark |
|-------|-------|------|
| `bg` | `#F2F2F4` | `#0D1117` |
| `surface` | `#FFFFFF` | `#161B22` |
| `border` | `#E2E8F0` | `#30363D` |
| `text` | `#0F172A` | `#E6EDF3` |
| `textSub` | `#64748B` | `#8B949E` |
| `accent` | `#135BEC` | `#4B82EF` |

### Cómo se aplica el tema

1. `ThemeContext.tsx` lee `darkMode` de `useSettingsStore` y la preferencia del sistema
2. Envuelve toda la app en `<ThemeProvider>` que expone `useTheme()` → `AppTheme`
3. Cada componente/pantalla:
   ```typescript
   const theme = useTheme();
   const st = useMemo(() => buildStyles(theme), [theme]);
   ```
4. Los estilos se crean en funciones `buildStyles(t: AppTheme)` que retornan `StyleSheet.create({...})`

### Regla para nuevos componentes
- **SIEMPRE** usar `useTheme()` + `useMemo` para estilos dinámicos
- **NUNCA** hardcodear colores: usar tokens del tema
- Los iconos de `lucide-react-native` deben usar `theme.text` o `theme.textSub` como color

---

## 9. Sistema NLP (Procesamiento de Lenguaje Natural)

### Dos motores independientes

| Motor | Archivo | Uso |
|-------|---------|-----|
| **Texto rápido** | `src/utils/nlp.ts` | Parsea input del campo de texto ("Uber 15", "café 4500") |
| **Voz completo** | `src/utils/voiceParser.ts` | Parsea transcripción de voz con soporte completo de español |

### voiceParser.ts — Capacidades

**Extracción de montos:**
- Números directos: `"20000"`, `"20.000"`
- Miles con palabra: `"20 mil"`, `"veinte mil"`
- Millones: `"5 millones"`, `"cinco millones"`, `"5 millones 400 mil"`
- Números en español: uno→veinte, treinta→noventa, cien→novecientos
- Separadores normalizados: comas → puntos automáticamente

**Extracción de tipo:**
- Gasto: gasté, compré, pagué, costó
- Ingreso: recibí, ingresé, cobré, sueldo, salario, freelance, quincena, mensualidad, honorarios, dividendos, rendimientos, reembolso, bono

**Extracción de fecha:**
- hoy

**Extracción de categoría:**
- Consulta primero `userCategories` (categorías dinámicas del usuario), luego `CATEGORY_MAP` legacy como fallback

**Fuzzy matching (`src/utils/fuzzyMatch.ts`)**: tanto `extractCategory`/`extractIsExpense`
(`voiceParser.ts`) como `guessCategoryEmoji` (`theme.ts`, usado por `nlp.ts`) reemplazaron su
`.includes(kw)` exacto por `fuzzyIncludes(haystack, kw)` — mismo match exacto como camino
rápido, pero con tolerancia a typos (distancia de Levenshtein) para keywords de una sola
palabra de 5+ caracteres (ej. "almuerso" → matchea "almuerzo"). Palabras cortas (<5 chars) y
keywords multi-palabra solo matchean exacto, para no generar falsos positivos. 100% offline,
sin dependencias — se evaluó meter IA/LLM para esto y se descartó por romper la regla de
offline-first (ver discusión completa archivada fuera del repo, sesión 2026-07-22). También se
usa en el filtro de texto libre de la barra de búsqueda del dashboard
(`useDashboardSearch.ts`, sección "Pipeline de búsqueda") — se descartó Fuse.js como dependencia
externa por el mismo principio de offline-first/sin-dependencias.

**Post-procesamiento:**
- `normalizeMoneyText(text)`: convierte `$40,000` → `$40.000` en el texto
- `replaceAmountInNote(text, amount)`: convierte `"cinco millones 400 mil"` → `"$5.400.000"` en la nota. Además asegura un espacio antes de `$` cuando está precedido por una letra (corrige "gasté$500.000" → "gasté $500.000")

**Multi-transacción (nuevas funciones):**
- `findAmountSpans(text)`: detecta todos los spans de expresiones monetarias distintas en el texto normalizado y retorna sus posiciones `{start, end}`. Soporta tanto dígitos (`30 mil`, `30.000`, `30000`) como **palabras en español** (`treinta mil`, `quince mil`, `cinco millones`, `cien mil`). El regex combina patrones numéricos y un vocabulario completo de números base (`W`) para cubrir los casos reales del habla colombiana
- `splitIntoSegments(text)`: divide el transcript completo en segmentos individuales usando conjunciones ("y", "también", "además", "luego", "después") que aparecen entre dos spans de monto. Los índices de los spans (del texto normalizado) mapean 1:1 con el texto original para español estándar (NFD preserva count de caracteres)
- `processMultiVoiceInput(raw, userCats?)`: función principal de entrada múltiple
  - Si detecta `≤ 1` monto → delega a `processVoiceInput` (flujo single)
  - Si detecta `> 1` montos → usa `splitIntoSegments`, procesa cada segmento con `processVoiceInput`, hereda `isExpense` del primer segmento si los siguientes no declaran tipo
  - Filtra segmentos sin monto válido
  - Retorna `{ multiple: false, single? } | { multiple: true, transactions[] }`

### nlp.ts — parseExpenseInput

Parseo simple para el campo de texto del formulario:
- Busca el primer número en el texto → monto
- Usa `guessCategoryEmoji(description, userCats?)` para categoría (consulta userCategories primero)
- Más ligero, se ejecuta en cada keystroke

### Reglas para extender NLP
- Mantener offline: **NUNCA** llamar APIs externas
- Los retornos de `extractCategory` y `extractDate` son `null` si no hay match (no forzar defaults)
- Usar `\b` (word boundaries) para evitar falsos positivos en regex

---

## 9b. Detección Automática de Transacciones Bancarias *(v1.5.0)*

### Componentes del Sistema

| Archivo | Rol |
|---------|-----|
| `index.js` | Entrypoint: registra el HeadlessJS task `RNAndroidNotificationListenerHeadlessJsName` |
| `src/services/notificationHeadlessTask.ts` | Función async que procesa cada notificación en background |
| `src/utils/notificationParser/` | Motor de extracción (carpeta, un módulo por responsabilidad — ver diseño abajo) |
| `src/store/useNotificationStore.ts` | Cola persistida (AsyncStorage) de transacciones pendientes de confirmación |
| `app/notification-review.tsx` | Pantalla de revisión antes de guardar |
| `app/settings.tsx` → `AutoDetectSection` | UI de configuración: toggle + permisos + selector de bancos |

### Flujo completo
```
Notificación bancaria (Nequi, Bancolombia, etc.)
    ↓
NotificationListenerService (nativo Android)
    ↓
HeadlessJS Task (notificationHeadlessTask.ts) — corre en background, incluso con la app cerrada
    ↓ [verifica: detección activa en AsyncStorage + banco en whitelist]
parseNotification(packageName, title, text)
    ↓ classifyIntent() clasifica ANTES de intentar extraer nada:
      otp / security_alert / payment_reminder / marketing / app_update / possible_transaction
    ↓ [retorna null si no es "possible_transaction" — incluye recordatorios de
      pago pendiente tipo "Tienes un pago por $X. Completa tu pago..." que NO
      son transacciones confirmadas, aunque mencionen un monto]
    ↓ extrae monto, tipo (gasto/ingreso) y descripción
useNotificationStore.addPendingItem(parsed) — agrega a la cola (dedup <2 min)
    ↓
notifyBankTransaction(amount, description, bankName, isExpense)
    → Push notification del sistema: "-$140.000 detectado — Nubank · Toca para revisar"
    → data: { screen: "notification-review" } para deep link
    ↓ [usuario toca la notificación push]
_layout.tsx addNotificationResponseReceivedListener → router.push("/notification-review")
    ↓  [o bien: usuario toca el badge 🔔 en el dashboard]
app/notification-review.tsx — lista de transacciones para revisar/editar/descartar
    ↓ [usuario confirma]
addTransactionBatch() → se guardan en SQLite
```

### src/utils/notificationParser/ — Diseño (carpeta, un módulo por responsabilidad)
- **Whitelist de 15 bancos colombianos** (`src/constants/banks.ts`): Bancolombia, Nequi, Davivienda, DaviPlata, BBVA, Bco. Occidente, Bco. Popular, AV Villas, Nu, Lulo Bank, Scotiabank Colpatria, Rappi, Tpaga, Bco. Bogotá, Itaú
- **`intentClassifier.ts`** — clasifica la intención de la notificación ANTES de intentar extraer nada, en 5 categorías nombradas y priorizadas: `otp`, `security_alert`, `payment_reminder`, `marketing`, `app_update`. Si no matchea ninguna, se asume `possible_transaction` y se continúa. La categoría `payment_reminder` existe específicamente para filtrar recordatorios de pago pendiente (ej. Nu: "Tienes un pago por $X. Completa tu pago...") que mencionan un monto pero NO son transacciones confirmadas — antes se colaban como gasto real.
- **`amountExtractor.ts`** — 6 patrones de mayor a menor especificidad: `$200.000,00`, `$1.234.567`, `$45000`, `200.000,00`, `45.000`, `45000`
- **`directionClassifier.ts`** — gasto vs ingreso: keywords explícitas ya confirmadas (`compra`, `pagó`, `pagaste`, `recibiste`, `consignación`, etc. — NO la palabra suelta "pago", ambigua) → confidence `"high"`. Si no hay keyword: heurística → gasto, confidence `"medium"`
- **`descriptionExtractor.ts`** — limpia el texto de la notificación (monto, saldo, fechas, frases fijas del banco) y devuelve la oración completa restante — no un fragmento tipo keyword
- **`bankPatterns.ts`** — un patrón por banco (Bancolombia, Nequi, Davivienda/DaviPlata, Nu, y `GENERIC_PATTERN` para el resto), cada uno valida que el texto aplique (`matches`) y extrae monto/dirección con sus reglas propias, pero **todos** usan `extractDescription()` para el campo `description` — antes cada patrón capturaba con una regex angosta solo el nombre del comercio/contraparte (ej. "RAPPI CO." en vez de "Compra en RAPPI CO."); se simplificó para mostrar la descripción completa y limpia en `notification-review.tsx`, dejando la edición manual (botón ✏️) para cuando el usuario quiera acortarla
- **`parseNotification.ts`** — orquesta el pipeline completo, es la API pública (`@/src/utils/notificationParser` resuelve a `index.ts`, que re-exporta esto)
- **`fixtures.ts`** — 9 casos reales/sintéticos con resultado esperado, cubiertos uno a uno por `parseNotification.test.ts` (Jest, `it.each`)
- **Score de confianza**: `"high"` (keyword explícita) / `"medium"` (heurística, incluye siempre `GENERIC_PATTERN`) / `"low"`
- **Privacidad**: `rawTitle` limitado a 100 chars, `rawText` a 200 chars. Saldos, números de tarjeta y datos personales son descartados.
- **Confidence-aware push**: `notifyBankTransaction()` (`notificationService.ts`) redacta el título distinto según `confidence` — `"detectado"` (asertivo) solo con `high`; a confirmar con `medium`/`low`. El item siempre requiere confirmación manual en `notification-review.tsx` antes de guardarse en SQLite.

### Configuración en AndroidManifest.xml (verificado contra el manifest fusionado real, 2026-07-13)
```xml
<service
  android:name="com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener"
  android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
  android:exported="true">
  <intent-filter>
    <action android:name="android.service.notification.NotificationListenerService"/>
  </intent-filter>
</service>
```

### Restricciones de permiso
- Android **requiere** que el usuario habilite manualmente el acceso en **Ajustes → Aplicaciones → Acceso a notificaciones**
- La app abre esa pantalla con `RNAndroidNotificationListener.requestPermission()`
- Si el permiso no está activo, el HeadlessJS task no recibirá notificaciones (Android lo bloquea a nivel OS)
- **Reinstalar la app revoca este permiso** — es comportamiento estándar de Android para permisos especiales, no un bug. Hay que volver a concederlo manualmente tras cada reinstalación.
- La configuración persiste en AsyncStorage, no en `useSettingsStore` (para acceso desde HeadlessJS sin React)

### Confiabilidad en background: optimización de batería del fabricante
`RNAndroidNotificationListener` es un `NotificationListenerService` estándar, pero fabricantes como Samsung (OneUI), Xiaomi (MIUI) y Huawei (EMUI) matan procesos en background agresivamente para ahorrar batería — esto puede afectar la detección incluso siendo un servicio del sistema, porque Android debe re-crear el proceso completo (evaluando todo `index.js` + `expo-router/entry`) para atender la siguiente notificación, y el `HeadlessJsTaskService` de la librería tiene un timeout fijo de 15s (no configurable desde JS) que un cold-start lento puede agotar.

`app/settings.tsx` → `AutoDetectSection` muestra, cuando la detección está activa, una tarjeta con botón "Abrir ajustes de batería" que deep-linkea a la pantalla nativa de info de la app (`Linking.openSettings()`) para que el usuario excluya MyWallet de la optimización — sin pedir el permiso especial `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, que Play Store escrutina mucho.

### Config plugin: `plugins/withAllowBackupDisabled.js`

`react-native-android-notification-listener` declara `android:allowBackup="false"` en su propio `AndroidManifest.xml` (para que Android no incluya el contenido de notificaciones bancarias en el auto-backup a Google Drive), pero el manifest base generado por el template de Expo/RN trae `allowBackup="true"` por defecto — esto rompe el manifest merger de Gradle (`Attribute application@allowBackup value=(true) ... is also present at [:react-native-android-notification-listener] AndroidManifest.xml value=(false)`).

Como `android/` está en `.gitignore` (se regenera con `expo prebuild`), un fix manual sobre el manifest se perdería en el próximo prebuild. Se resolvió con un config plugin local, `plugins/withAllowBackupDisabled.js` (usa `withAndroidManifest` de `@expo/config-plugins`), registrado como último plugin en `app.json → plugins`. Fuerza `allowBackup="false"` explícitamente (no `"true"`, que sería la otra forma de resolver el conflicto) porque es la opción más segura para una app que procesa texto de notificaciones bancarias, consistente con la regla de no almacenar datos bancarios sensibles.

Este bug estaba latente sin detectar porque nadie había corrido `expo prebuild -p android` + build real en este repo antes (detectado y corregido 2026-07-13).

### Entrypoint: `index.js`
El archivo `package.json` apunta `"main": "index.js"` (en lugar del default `expo-router/entry`). El `index.js` registra el HeadlessJS task **antes** de inicializar Expo Router, garantizando que el task esté disponible desde el inicio:
```javascript
AppRegistry.registerHeadlessTask(RNAndroidNotificationListenerHeadlessJsName, () => notificationHeadlessTask);
import "expo-router/entry";
```

---

## 10. Categorías (Sistema Dinámico)

### 10.1 Modelo de Datos

Las categorías son **dinámicas y personalizables por el usuario**. Se almacenan en `useSettingsStore.userCategories` como array de `UserCategory`:

```typescript
interface UserCategory {
  id: string;          // "preset_food" o "custom_1234567890"
  emoji: string;       // Emoji nativo del sistema
  name: string;        // Nombre visible
  colorBg: string;     // Color de fondo (pastel)
  colorAccent: string; // Color de acento
  type: "expense" | "income";
  keywords: string[];  // Palabras clave para NLP
  isPreset: boolean;   // true = del catálogo, false = creada por el usuario
}
```

### 10.2 Catálogo de Presets

Definidos en `src/constants/categoryPresets.ts`:

- **18 presets de gasto**: Comida, Transporte, Hogar, Compras, Salud, Entretenimiento, Educación, Personal, Ropa, Mascotas, Vehículo, Lujo, Viajes, Suscripciones, Deportes, Café, Regalos, Comer afuera
- **6 presets de ingreso**: Salario, Freelance, Inversiones, Extra, Negocio, Otros ingresos
- **Paleta de 12 colores premium** para categorías custom
- **~96 emojis curados** organizados por temática para el selector

### 10.3 Flujo del Usuario

1. **Primera vez (onboarding):** Después del splash, aparece `category-onboarding.tsx` con grid de tarjetas seleccionables + botón "Añadir categoría" (`NewCategoryModal` con selector de emoji, `HueColorPicker` y nombre).
2. **Desde Settings:** Sección "Mis categorías" muestra las elegidas y botón "Gestionar categorías" que reabre la misma pantalla en modo edición. Editar una categoría abre un modal con `HueColorPicker` para cambiar el color.
3. **Inline desde Nuevo Gasto/Ingreso:** El `CategorySheet` en `active-expense.tsx` incluye un ítem "Nueva" (ícono `+`) al final de la grilla. Al tocarlo, cierra el sheet y abre `NewCategoryModal`; al guardar, la nueva categoría se persiste vía `addUserCategory()` y queda autoseleccionada en la transacción.
4. **No se puede saltar la selección:** El usuario debe elegir al menos 1 categoría en el onboarding.

### 10.4 Fuentes de verdad
- **`src/constants/categoryPresets.ts`**: Catálogo de presets, paleta de colores, emojis curados, tipo `UserCategory`
- **`src/store/useSettingsStore.ts`**: `userCategories` (array persistido), helpers `getUserExpenseCategories()`, `getUserIncomeCategories()`, `getCategoryByEmoji()`
- **`src/constants/theme.ts`**: `getCategoryColor()`, `guessCategoryEmoji()`, `getCategoryName()` — consultan primero `userCategories`, luego legacy como fallback

### 10.5 Regla
Para agregar una categoría preset, solo modificar `categoryPresets.ts`. Las categorías custom se crean desde la UI y se guardan automáticamente en el store.

---

## 11. Componentes UI Reutilizables

### CategoryChart
- Gráfica de barras verticales con scroll horizontal
- **Modo gastos:** porcentaje según presupuesto, colores de alerta (base/rojo)
- **Modo ingresos** (prop `isIncomeMode`): barras verdes proporcionales al mayor ingreso de categoría; sin presupuesto ni "Editar presupuesto" en popup
- **Lógica visual de la barra (sin/con presupuesto):**
  - **Sin presupuesto:** fill gris neutro adaptable al tema (`NEUTRAL_FILL`) con `opacity: 1`, altura proporcional al gasto. Sin ghost border.
  - **Con presupuesto:** fill con color `accent` de la categoría (`opacity: 0.68`) + ghost border siempre visible que indica el límite del presupuesto.
  - **Overspent (>100%):** fill rojo `#EF4444`. El `ghostH` se ajusta para que la línea fantasma siga marcando exactamente la frontera del presupuesto dentro de la barra excedida.
- **Orden de las columnas:** primero categorías **con presupuesto** (incluso si gasto=0, para que se vea su ghost), luego categorías **con gasto sin presupuesto**, y por último las **vacías** (solo en modo gastos).
- **Etiquetas dentro del fill (vertical):** emoji + monto + %. El % se renderiza **solo si hay presupuesto y `pct ≥ 40%`** — debajo de ese umbral chocaría con el monto y el emoji.
- **Animación scroll-driven (Reanimated):** `scrollY` pasado desde el Dashboard anima las barras al hacer scroll
  - Cada `AnimatedBar` recibe `scrollY: SharedValue<number>` y usa `interpolate` para comprimir `fillH` desde el valor real hasta `MIN_FILL_H` (52px)
  - Las etiquetas verticales (emoji + monto + %) hacen crossfade a un layout horizontal compacto (emoji | monto) cuando las barras se comprimen
  - El ghost hace fade-out coordinado con la compresión
  - Barras ya compactas (`fillH ≤ MIN_FILL_H`) muestran etiqueta horizontal desde el inicio
- **Tap corto en columna → filtro por categoría:** llama `onCategoryTap?.(emoji, name)`. El Dashboard lo conecta a `useUIStore.setCategoryFilter`, oculta la gráfica y muestra solo las transacciones de esa categoría con un chip informativo. Se limpia con back físico o con pull-down sin spinner.
- **Long-press popup (~380ms):** etiqueta superior dinámica — muestra `"AGREGAR\nPRESUPUESTO"` si `budgetByCategory[emoji]` es undefined o 0, y `"EDITAR\nPRESUPUESTO"` si tiene un valor configurado. Fila inferior siempre disponible: `"NUEVA\nTRANSACCIÓN"`. En modo ingresos solo aparece `"NUEVA\nTRANSACCIÓN"`.
- **Race condition long-press / tap:** `consumedRef` evita que `onTouchEnd` dispare el filtro (tap) después de que `onPanResponderRelease` consumió un long-press. Se setea en true en cualquier handler de release que detecta `activeRef === true`, y se resetea en `onTouchStart`.
- **Reordenamiento animado:** `LayoutAnimation.configureNext()` se activa cuando cambian las stats, proporcionando una transición suave al reordenar columnas
- Lee `userCategories` del store para colores y nombres dinámicos
- `containerRef` + `measure()` para calcular posición absoluta del popup de long-press
- **Constantes clave:** `BAR_W=68`, `MAX_BAR_H=280`, `MIN_FILL_H=52`, `MIN_GHOST_H=44`, `COMPRESS_END=140`, `CHART_H=304`, `CHART_COMPACT_H=76`, `PCT_MIN_RATIO=0.40`

### FloatingDock
- Dock inferior que reemplaza la tab bar nativa
- Contiene: botón +, lupa, FAB micrófono (azul, prominente)
- El botón + abre un menú popup con opciones Gasto/Ingreso
- Fondo semi-transparente oscuro al abrir menú

### TransactionItem
- Muestra emoji, descripción (truncada), fecha absoluta ("3 mar 2026", no relativa "Hoy"/"Ayer"), monto formateado
- Layout: nombre de categoría + fecha en flex row (categoría shrinks con `flexShrink: 1`, fecha se mantiene)
- Resolución de nombre de categoría: `userCategories` → `savingsGoals` → `EMOJI_TO_CATEGORY_NAME` → "General"
- **Modo claro:** fondo blanco (`#FFFFFF`) con sombra sutil (card-like)
- **Modo oscuro:** fondo `t.itemBg`
- **Swipe-to-delete** (PanResponder + Animated): deslizar izquierda revela botón papelera rojo
  - `onStartShouldSetPanResponder: () => false` — el FlatList recibe los toques primero
  - `onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy)` — solo reclama el gesto cuando hay swipe horizontal claro
- **Tap → detalle** (reemplazó long-press): toque simple abre el modal de detalle con haptic `selectionAsync`
  - Si hay un swipe abierto, el tap cierra el swipe en lugar de abrir el detalle
- **Patrón de capas:** `Animated.View` (exterior: swipe + PanResponder) envuelve `TouchableOpacity` (interior: tap → detalle)
- Prop `onDelete` (antes `onLongPress`) para el callback de eliminación desde el botón de la papelera
- Animación de entrada: `FadeInDown.delay(index * 40)`
- Gastos en negro con `−`, ingresos en verde `#059669` con `+`

### FilterChips
- **Un solo chip** de período: 6 períodos fijos: Hoy, Esta semana, Esta quincena, Este mes, Este año, Todo + "📅 Elegir mes específico..." al fondo del sheet
- Props: `period`, `periodLabel?` (label dinámico, ej: "Abr 2025"), `onPeriodChange`, `onOpenMonthPicker?`
- El chip de categoría fue eliminado del `FilterChips` — el filtrado por categoría se activa con tap corto en una columna del `CategoryChart` (ver `useUIStore.categoryFilter`) o desde la búsqueda
- Abre un único Modal bottom-sheet al tocar

### MonthPickerModal
- Sheet inferior que permite elegir un mes y año concreto como filtro del Dashboard
- Pills de año dinámicos: desde `queryFirstTransactionYear()` hasta el año actual; "Todo el tiempo" limpia el filtro
- Grid 3×4 de meses (Ene–Dic) con monto compacto bajo cada celda (`45k`, `1.7M`)
- Mes seleccionado: fondo `#DBEAFE`, texto `#1D4ED8`; meses futuros deshabilitados (opacity 0.3)
- Estado draft interno: cambios pendientes hasta tocar "Aplicar"; X descarta sin aplicar
- Animación: `animationType="slide"` nativo del Modal (sin Reanimated en el sheet para evitar conflictos de touch)
- Dark mode: pill año activo usa `t.accent` en oscuro, `#0F172A` en claro

### ConfirmDialog
- Componente reutilizable que reemplaza `Alert.alert` nativo con un diálogo minimalista y animado
- **3 variantes:** `danger` (icono papelera rojo), `warning` (triángulo ámbar), `info` (icono azul informativo)
- Animación: spring scale + fade-in al abrir
- Diseño: card centrado con `borderRadius: 24`, icono circular en la parte superior, título, mensaje, dos botones (cancelar/confirmar)
- Tap en backdrop cierra el diálogo
- Soporte completo dark/light mode vía `useTheme()`
- Props: `visible`, `variant`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`
- Usado en: `settings.tsx` (limpiar datos, eliminar método de pago, error de exportación, mínimo un método)

### RollingNumber
- **Odómetro por dígito** estilo cuentakilómetros de carro: cada posición tiene su propia columna de 10 dígitos (0–9) apilados verticalmente con `overflow: hidden`
- Cuando el valor cambia, cada columna anima su `translateY` con `withTiming(Easing.out(Easing.cubic))` en el UI thread (60fps, Reanimated)
- **Keys estables** basados en posición desde la derecha (`d-0`, `d-1`, `sep-3`, etc.): cuando el conteo de dígitos cambia, los dígitos existentes conservan su estado y solo los nuevos/eliminados hacen fade-in/out con `FadeInDown` y `FadeOut`
- **Separadores de miles COP** (`.`) renderizados como componentes independientes entre columnas; aparecen/desaparecen con animación cuando el número de dígitos cruza una frontera de grupo (×3)
- **`digitHeight`:** calculado desde `lineHeight` del estilo; si no hay `lineHeight`, se estima como `fontSize * 1.28`
- **Compatibilidad:** no puede ir dentro de `<Text>` (es un `View`). Las pills del Dashboard fueron reestructuradas a `<View row>` con `<Text>↓</Text>` + `<RollingNumber />`
- Props: `value`, `prefix` (default `"$ "`), `style: StyleProp<TextStyle>`, `duration` (default 400ms)
- Usado en Dashboard: Balance neto (fontSize 38, lineHeight 44), Pill gastos (fontSize 13), Pill ingresos (fontSize 13)

### GuidedTour
- Overlay reutilizable de onboarding paso a paso con efecto spotlight
- Props: `steps: TourStep[]`, `currentStep: number`, `globalStep: number`, `totalSteps: number`, `visible: boolean`, `onSkip: () => void`
- Cada `TourStep`: `targetRef` (React ref), `title`, `message` (texto), `buttonLabel`, `onAction` (callback)
- Usa `Modal` con `statusBarTranslucent` para estar siempre encima de FloatingDock y todo el contenido
- `measureInWindow` para posicionar el spotlight; en Android se compensa con `StatusBar.currentHeight` porque `measureInWindow` reporta coordenadas relativas a la ventana (debajo del status bar) pero el Modal empieza desde el tope absoluto de la pantalla. Este offset se adapta automáticamente a cada dispositivo Android
- Overlay oscuro con 4 rectángulos alrededor del cutout + ring circular del spotlight
- Tooltip estilo Stitch: título, descripción, botones "Omitir" + CTA, dots de progreso
- Animación: fade-in del overlay + spring scale del tooltip
- Utilidad complementaria: `src/utils/tourRefs.ts` — registro global de refs (`getTourRef(key)`, constantes `TOUR_KEYS`)

### BudgetBar
- Barra de progreso animada (Reanimated)
- Muestra `X% de $presupuesto`
- Se vuelve roja al superar 90%
- Solo visible si `monthlyBudget > 0`
- Usa `monthlyBudget` directamente (presupuesto siempre mensual)

---

## 12. Pantallas y Rutas

### Dashboard (`app/(tabs)/index.tsx`)
- Balance neto (tipografía 38px, weight 800)
- Pills inline (Gastos/Ingresos) con toggle por tipo
- Barra de presupuesto inline (condicional: `monthlyBudget > 0`, sin filtro de tipo, solo período actual). Usa `monthlyBudget` directamente (presupuesto siempre mensual)
- FilterChips — un solo chip de período con `periodLabel` y `onOpenMonthPicker`. Por defecto muestra "Este mes"
- CategoryChart (gráfica de barras) — recibe `isIncomeMode` y `allEmojis` contextual
- **`FlatList`** reemplaza `ScrollView + map` — chart y cabecera van en `ListHeaderComponent`, estado vacío en `ListEmptyComponent`; `renderItem` en `useCallback`
- **`PeriodFilter` tipo unificado:** discriminante con 4 variantes (`quick`, `month`, `year`, `all`) — reemplaza los estados separados `period` + `pickerYear` + `pickerMonth`
- **`applyPeriodFilter()`:** función pura fuera del componente que maneja los 4 casos de filtrado por fecha
- `MonthPickerModal` — integrado con `PeriodFilter` directamente (`onApply` construye el tipo correcto)
- `filteredTransactions` respeta `PeriodFilter` (período rápido, mes específico, año, o todo)
- `categoryStats` e `incomeStats` usan `filteredTransactions` (dinámicos al período seleccionado)
- Presupuesto solo visible si `isCurrentPeriod === true`
- **Estado "período vacío":** cuando `filteredTransactions.length === 0` y es el período actual, muestra barras fantasma (opacity 0.18) con mensaje centrado: "Nuevo mes, ¡comienza ahora!". Si es un período pasado sin datos: "Sin registros en este período"
- **Modal de detalle de transacción:** al hacer **tap** en un item de la lista se abre un modal centrado estilo Stitch con: emoji, monto, categoría, tipo (Gasto/Ingreso), cuenta (método de pago), fecha, hora (formato 12h), descripción y tags. Si el item tiene el swipe abierto, el tap cierra el swipe primero
- **Filtro por categoría desde la gráfica:** un tap corto en una columna del `CategoryChart` activa `setCategoryFilter({ emoji, name })`. Mientras el filtro está activo:
  - Se oculta la gráfica (`!categoryFilter` condiciona el render).
  - La cabecera de la lista cambia a `categoryFilter.name.toUpperCase()` con un chip informativo (sin botón ×).
  - `displayedTransactions` filtra por `tx.category === emoji` (`useDashboardSearch` prioriza `categoryFilter` sobre tags y `typeFilter`).
  - Limpieza con: (1) `BackHandler` físico — `useEffect` registra/desregistra el listener cuando `categoryFilter` cambia; (2) **pull-down sin spinner** — `PanResponder` de captura aplicado en un `View` envoltorio del `Reanimated.FlatList`. La lectura de "estoy en el tope" usa `useAnimatedReaction(() => scrollY.value <= 4, ..., runOnJS)` para sincronizar un ref JS sin overhead por frame. Si `dy > 80` al soltar, vibra y limpia el filtro. NO se usa `RefreshControl` (mostraría un spinner que sugiere "recargar contenido", lo cual confunde).
- Barra de búsqueda: `keyboardExtraAnim` sube la barra sobre el teclado al abrirse
- **Guided Tour:** integración con `GuidedTour` (5 pasos, solo primera vez). Refs de targets registrados en `tourRefs.ts`. El flujo alterna entre Dashboard y Settings. Persistido con `hasCompletedOnboarding` + `onboardingStep`
- **Eliminado:** chip de categoría, estilos de metas de ahorro, ScrollView+map, banner in-app de presupuesto excedido (reemplazado por notificación push), todo el sistema de toasts.

### Active Expense (`app/active-expense.tsx`)
- Título dinámico: "Nuevo Gasto" / "Nuevo Ingreso"
- Monto grande con tamaño adaptable (36-64px según dígitos)
- Campo de descripción con NLP en tiempo real
- Selectores: Fecha (Hoy / Calendario), Categoría (grid contextual con ítem "Nueva" para crear al vuelo), Cuenta
- El método de pago (Cuenta) seleccionado se guarda en la transacción (campo `payment_method` en DB)
- Tags sugeridos + custom
- Botón ✓ para guardar (vibración + navegar atrás)
- `adjustsFontSizeToFit` como fallback para montos enormes
- **Param `?from=batch-review` / `?from=notification-edit`:** cuando la pantalla es abierta desde `voice-batch-review` o desde el botón ✏️ de `notification-review`, el flujo de guardar cambia (mismo tratamiento para ambos origenes, vía `fromBatchReview || fromNotificationEdit`):
  - Lee `from` con `useLocalSearchParams<{ from?: string }>()`
  - Al confirmar ✓: en lugar de `addTransaction` + `router.dismissAll()`, llama `setPendingManualItem({...})` + `store.reset()` + `router.back()`
  - Esto devuelve los datos al store sin guardar en DB; `voice-batch-review`/`notification-review` los recoge con `useFocusEffect` y los agrega/actualiza en la lista de revisión
  - Al cerrar ✗ también usa `router.back()` (no `router.dismissAll()`) para preservar la pantalla de revisión en la pila
  - **Fix de bug (este rango):** el `useEffect` que reparsea `store.note` en tiempo real (NLP reactivo) ahora retorna temprano cuando `fromBatchReview || fromNotificationEdit` es `true` — antes, editar la descripción de un item ya estructurado (viniendo de `notification-review`) disparaba el parser de texto libre y podía sobreescribir el monto real ya extraído por `notificationParser` con uno mal interpretado del texto
- **Edición del monto (UX):** tocar el monto activa `amountEditing` y muestra un `TextInput` con dígitos crudos sin puntos de miles (`amountDisplay`, filtrado con `.replace(/\D/g, "")` en cada tecla) — insertar puntos de miles en cada cambio reformatearía el string completo y el cursor saltaría al final en Android, impidiendo editar un dígito en medio del monto. Los puntos de miles reaparecen al perder el foco (`handleAmountBlur`), cuando el monto vuelve a mostrarse como texto estático con `fmtCOP()`

### Voice Input (`app/voice-input.tsx`)
- Orb animado que indica estado de escucha
- Transcripción en tiempo real con animación palabra por palabra (AnimatedWords)
- Estados: idle → listening → processing → done
- **Flujo single:** si `processMultiVoiceInput` detecta 1 transacción → `setFromVoice(single)` + `router.replace("/active-expense")` para revisar/confirmar el formulario
- **Flujo multi-transacción:** si detecta ≥ 2 montos en el transcript:
  - Llama `reset()` (limpia estado de voz) y luego `setPendingBatch(result.transactions)` — **el orden importa**: `reset()` debe ir antes de `setPendingBatch` porque `reset()` limpia `pendingBatch`
  - Navega con `router.replace("/voice-batch-review")` a la pantalla de revisión
- `statusLabel` muestra `"Analizando tu registro..."` durante el procesamiento multi-voz

### Voice Batch Review (`app/voice-batch-review.tsx`) *(nuevo)*
- Pantalla fullscreen modal que se muestra cuando el flujo multi-voz detecta ≥ 2 transacciones
- **Header:** flecha atrás + "Revisar registros" + contador de transacciones detectadas
- **FlatList** de `ReviewItemCard`s: cada tarjeta muestra emoji coloreado, descripción, nombre de categoría, badge tipo (↓ Gasto rojo / ↑ Ingreso verde), monto, botón ✏️
- **Swipe-left en tarjeta** → botón rojo eliminar (PanResponder + Animated, mismo patrón que `TransactionItem`)
- **Botón ✏️** → abre `EditItemSheet` (Modal bottom-sheet) con: toggle Gasto/Ingreso, campo monto, campo descripción, selector de categoría (abre `CategorySheet` interno)
- **Link "Añadir registro manual"** → `router.push("/active-expense?from=batch-review")`. El registro no se guarda en DB — cuando el usuario confirma en `active-expense`, los datos van a `useVoiceStore.pendingManualItem` y al volver a `voice-batch-review` se agregan como nueva tarjeta via `useFocusEffect`
- **Footer sticky:** `"N registros · Total $ X"` + botón azul `"Guardar todo"`. Al confirmar: `addTransactionBatch(items)` → `clearPendingBatch()` → `router.dismissAll()`. En caso de error, `Alert.alert` nativo
- Si `pendingBatch` está vacío al montar (p.ej. llegó por error), hace `router.back()` inmediatamente

### Settings (`app/settings.tsx`)
- **Control financiero (orden de opciones):**
  1. **Ingreso mensual** — cuánto dinero dispones al mes
- Métodos de pago → modal full-screen
- Presupuesto por categoría → modal full-screen
- **Metas de ahorro:** `NuevaMetaModal` (crear), `AbonarMetaModal` (abonar), `SavingsGoalsSection` con `SwipeableGoalItem` (swipe-to-delete izquierda revela botón papelera rojo). Al abonar a una meta, se crea automáticamente una transacción de gasto con el emoji de la meta, descripción "Abono a [nombre]" y tag #ahorro
- Apariencia → selector dark mode
- **Detección automática** *(nuevo en v1.5.0)*: sección con componente `AutoDetectSection`:
  - Toggle para activar/desactivar la captura de notificaciones bancarias
  - Al activar sin permiso: muestra diálogo explicativo centrado → abre ajustes del sistema con `RNAndroidNotificationListener.requestPermission()`
  - Selector de bancos: lista todos los 15 bancos de la whitelist; si no se selecciona ninguno, usa todos
  - Card informativa de privacidad (azul tenue): explica que solo se extrae monto y comercio
  - Card de optimización de batería (ámbar, visible solo con la detección activa): botón "Abrir ajustes de batería" — ver sección 9b
  - Configuración persiste en `AsyncStorage` con claves `mywallet-auto-detect-enabled` y `mywallet-auto-detect-banks`
- Sistema: exportar CSV, limpiar datos
- **Exportar CSV:** usa `Share` de `react-native`. No usa `expo-sharing` ni `expo-file-system`.
- **Confirmaciones:** Todas las alertas usan `ConfirmDialog` (componente custom con animación y variantes)
- **Guided Tour:** paso 2 hace spotlight en la fila "Ingreso mensual"; paso 3 hace spotlight en el botón ← (volver)

### Notification Review (`app/notification-review.tsx`) *(nuevo en v1.5.0)*
- Pantalla fullscreen modal para revisar transacciones detectadas automáticamente desde notificaciones bancarias
- Diseño basado en la pantalla "Review Transactions (Light)" de Stitch
- **Header:** flecha azul (ChevronLeft) + "Revisar registros" (bold 20px) + subtítulo "N transacciones detectadas" + botón 🗑️ "Descartar todo" a la derecha
- **FlatList** de `ReviewCard`s: icono de categoría en círculo + descripción + fila de metadatos (nombre categoría + badge tipo `↓ Gasto` rojo / `↑ Ingreso` verde) + monto + botón ✏️ + botón 🗑️
- **Footer de la lista:** sección "¿Falta algo?" + "+ Añadir registro manual" (azul, abre `active-expense`)
- **Botón ✏️** → navega a `active-expense.tsx?from=notification-edit` (reutiliza el formulario completo, no un sheet propio — a diferencia de `voice-batch-review.tsx`, que sí tiene su propio `EditItemSheet` inline)
- **Botón 🗑️ por item** → `handleDeleteItem(id)`: quita el item de la lista local y llama `removePendingItem(id)` del store — sin diálogo de confirmación
- **Botón 🗑️ del header ("Descartar todo")** → `handleDiscardAll()`: vacía `items` y llama `clearAll()` del store — a diferencia del borrado individual, **sí** pide confirmación vía `ConfirmDialog` (mismo componente que usa `settings.tsx`/`chat.tsx`), porque perder toda la cola de una vez es una acción más costosa
- **Footer sticky:** `"N REGISTROS · TOTAL $ X"` (letras espaciadas) + botón pill azul "Guardar todo"
- **Estado vacío:** icono 🔕, mensaje explicativo, botón "Entendido"
- Al guardar: `addTransactionBatch(items)` (con `date: new Date()`) + `clearAll()` (store) + `router.back()`. En caso de error, `Alert.alert` nativo

---

## 13. Formato de Moneda (COP)

### Función centralizada: `src/utils/formatMoney.ts`

```typescript
// Formatea número a string con puntos de miles
formatMoneyDisplay(value: number): string
// Ej: 5400000 → "5.400.000"

// Formato completo con símbolo
formatCOP(value: number): string
// Ej: 5400000 → "$ 5.400.000"

// Formateo durante input (mientras el usuario escribe)
formatMoneyInput(text: string): string
```

### Regla CRÍTICA
- **NUNCA** usar `toLocaleString()` para formato de moneda — es inconsistente entre dispositivos Android
- **SIEMPRE** usar la regex custom: `Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")`
- El separador de miles es PUNTO (`.`), no coma
- No hay decimales en COP

---

## 14. Animaciones y Micro-interacciones

### Librería: react-native-reanimated v4

| Efecto | Componente | Implementación |
|--------|-----------|----------------|
| Entrada de items | TransactionItem | `FadeInDown.delay(index*40).duration(300)` de Reanimated |
| Palabra por palabra | voice-input AnimatedWords | `FadeIn.duration(220)` por palabra nueva |
| Barra de presupuesto | BudgetBar | `useSharedValue` + `withTiming` |
| Orb de voz | voice-input VoiceOrb | `withRepeat` + `withTiming` (pulsación) |
| Feedback háptico guardar | active-expense | `expo-haptics` `notificationAsync(success)` |
| Feedback háptico tap-detalle | TransactionItem | `expo-haptics` `selectionAsync()` en cada tap |
| Swipe-to-delete transacciones | TransactionItem | `PanResponder` + `Animated` de RN (`translateX`) |
| Swipe-to-delete metas | SwipeableGoalItem (settings) | `PanResponder` + `Animated` de RN |
| Badge nombre categoría | CategoryChart | `Animated.Value` fade + translateY, auto-descarta 1.6s |
| **Compresión de barras al scroll** | CategoryChart + Dashboard | `scrollY: SharedValue` + `interpolate` en `AnimatedBar`: `fillH` comprime de valor real a `MIN_FILL_H(52)` cuando `scrollY ∈ [0, COMPRESS_END(140)]` |
| **Crossfade labels scroll** | CategoryChart `AnimatedBar` | `verticalOpacityStyle` (fade-out) + `horizontalOpacityStyle` (fade-in) con rangos `[COMPRESS_END*0.75, COMPRESS_END]`; barras cortas muestran horizontal desde el inicio |
| **Ghost fade al scroll** | CategoryChart `AnimatedBar` | `ghostFadeStyle`: opacity `[COMPRESS_END*0.85, COMPRESS_END]` |
| **Odómetro de dígitos** | RollingNumber → DigitColumn | `useSharedValue` + `withTiming(Easing.out(cubic), 400ms)` por columna; `FadeInDown`/`FadeOut` para columnas que aparecen/desaparecen |
| Diálogo de confirmación | ConfirmDialog | Spring scale (0.85→1) + fade-in opacity, 3 variantes (danger/warning/info) |
| Spotlight de onboarding | GuidedTour | Fade-in overlay oscuro con cutout circular + spring scale del tooltip. Transición animada entre pasos |
| Tap → detalle transacción | TransactionItem | `TouchableOpacity.onPress` → haptic + modal fade. Si swipe abierto: cierra swipe primero |

### Reglas para animaciones
- Usar `Reanimated` para animaciones de layout y gestos complejos (scroll-driven, odómetro)
- Usar `Animated` de RN solo para `PanResponder` (incompatible con Reanimated en algunos casos)
- Duraciones estándar: entrada 200-300ms, feedback 100-150ms
- Easing por defecto: `Easing.out(Easing.cubic)`
- **Patrón para items con swipe + tap:** `Animated.View` (outer, maneja `translateX` + `PanResponder`) envuelve `TouchableOpacity` (inner, captura el tap). `onStartShouldSetPanResponder: () => false` para no bloquear el scroll del `FlatList`

---

## 15. Convenciones de Código

### Nomenclatura
| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes | PascalCase | `CategoryChart.tsx` |
| Hooks | camelCase con `use` | `useLocalNLP.ts` |
| Stores | camelCase con `use` | `useFinanceStore.ts` |
| Utils | camelCase | `formatMoney.ts` |
| Constantes | UPPER_SNAKE_CASE | `CATEGORY_MAP`, `DOCK_HEIGHT` |
| Tipos/Interfaces | PascalCase | `AppTheme`, `TransactionRow` |
| Archivos de ruta | kebab-case | `active-expense.tsx`, `voice-input.tsx` |

### Estilos
1. **Preferencia:** Funciones `buildStyles(theme: AppTheme)` que retornan `StyleSheet.create({...})`
2. **NativeWind:** Usado en `global.css` y algunos componentes, pero la mayoría usa StyleSheet directo
3. **No mezclar:** En un mismo componente, usar UN solo sistema de estilos
4. **Memoización:** Siempre `useMemo(() => buildStyles(theme), [theme])` para estilos dinámicos

### Idioma
- **Código:** Variables, funciones, tipos en inglés
- **UI:** Todo texto visible al usuario en español
- **Comentarios:** Español preferido para documentación interna

### Imports
- Usar `@/` para imports relativos desde la raíz
- Agrupar: React/RN → Expo → Terceros → Locales

---

## 16. Mejores Prácticas Adoptadas

### React Native (Fuente: documentación oficial 2026)

1. **New Architecture obligatoria** — SDK 55+ no soporta la legacy architecture
2. **Componentes funcionales** — No usar class components
3. **Hooks para todo** — Estado local (`useState`, `useMemo`), efectos (`useEffect`), refs (`useRef`)
4. **Separación presentación/lógica** — Componentes UI en `src/components/`, lógica en `store/` y `features/`

### Zustand (Fuente: mejores prácticas 2026)

1. **Un store por dominio** — finanzas, settings, UI, voz, formulario
2. **Acciones colocadas** — Las acciones viven DENTRO del store, no fuera
3. **Selectores específicos** — `useFinanceStore(s => s.transactions)` en vez de `useFinanceStore()`
4. **Persist solo lo necesario** — Solo settings se persiste; transacciones viven en SQLite

### SQLite (Fuente: expo-sqlite docs 2026)

1. **WAL mode activado** — Mejora concurrencia
2. **Fechas ISO locales** — `localISOString()` evita desfase UTC
3. **Migraciones safe** — `ALTER TABLE` en try/catch
4. **No almacenar datos sensibles** — Sin números de cuenta/tarjeta reales

### Performance

1. **FlatList** para listas largas — implementado en Dashboard (`index.tsx`), reemplazó `ScrollView + map`
2. **`useMemo`** para cálculos derivados costosos (totales, stats, filtros)
3. **`useCallback`** para `renderItem` y `keyExtractor` del FlatList
4. **Animaciones en UI thread** — Reanimated worklets para 60fps
5. **Funciones puras fuera del componente** — `applyPeriodFilter`, `formatBalance`, `normalize` no se recrean en cada render
6. **Presupuesto directo** — `monthlyBudget` y `budgetByCategory` se usan directamente sin transformación (el presupuesto es siempre mensual)

---

## 17. CI/CD y Despliegue

### GitHub Actions (solo disparo manual)

| Workflow | Archivo | Acción |
|----------|---------|--------|
| EAS Build | `eas-build.yml` | Construye APK Android (perfil `preview`) |
| EAS Update | `eas-update.yml` | Publica OTA update a `production` |

**Importante:** Los triggers automáticos (`on: push`) fueron deshabilitados para controlar el consumo del plan gratuito de EAS. Solo `workflow_dispatch` está activo.

### Build local

```bash
# Requisitos: JDK 17, Android SDK, ANDROID_HOME configurado
npx expo run:android

# Instalar en dispositivo físico
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Variables de entorno requeridas
- `EXPO_TOKEN` — Secret en GitHub para EAS
- `JAVA_HOME` — JDK 17 para builds locales
- `ANDROID_HOME` — Android SDK

### Landing page y política de privacidad (GitHub Pages, `docs/`)

Además del build de la app, el repo sirve un sitio estático público vía **GitHub Pages**, configurado
a nivel de repositorio (rama `master`, carpeta `/docs`) — no es parte del pipeline de EAS ni de la app
en sí. Público en **https://jhonnyxt.github.io/my-wallet-app/**.

| Archivo | Contenido |
|---------|-----------|
| `docs/index.html` | Landing pública: hero, features, CTA "Descargar APK" |
| `docs/privacy-policy.html` | Política de privacidad (antes vivía dentro de `index.html`, se separó a su propio archivo) |
| `docs/icon.png`, `docs/favicon.png` | Assets del sitio |

**Motivo de existencia:** Google Play Console exige una URL pública de política de privacidad para
publicar la app en la Play Store — `docs/privacy-policy.html` cumple ese requisito de compliance. No
está pensado como manual de usuario ni documentación del producto (eso es `DOCUMENTATION.md`).

**Proceso manual al lanzar una versión nueva (sin automatizar):** el botón "Descargar APK" de
`docs/index.html` apunta a un asset fijo de un GitHub Release (ej.
`https://github.com/JhonnyXT/my-wallet-app/releases/download/v1.5.0/app-release.apk`), no a "la última
versión" de forma dinámica. Al sacar una versión nueva hay que, manualmente:
1. Publicar un GitHub Release nuevo con el APK compilado: `gh release create vX.Y.Z <ruta-al-apk> ...`
2. Actualizar el link de descarga en `docs/index.html` para que apunte al asset nuevo.

Si se omite el paso 2, la landing sigue ofreciendo una versión vieja del APK sin que nada lo avise —
no hay CI/workflow que sincronice esto. Queda como deuda de proceso (ver sección 18).

La landing se diseñó con ayuda de la skill/plugin `ui-ux-pro-max`, instalada a nivel de usuario de
Claude Code — no es parte de este repo ni de `.agents/skills/`, no requiere instalación local para
clonar/editar el HTML.

---

## 18. Problemas Conocidos y Deuda Técnica

### Código inactivo
> `CustomTabBar.tsx`, `ActionPills.tsx` y `AnimatedNumber.tsx` (huérfanos) y `useVoiceExpense.ts`
> (hook roto) fueron **eliminados del repo** — ver AGENTS.md, sección "Deuda técnica documentada".

| Archivo | Problema |
|---------|---------|
| `BudgetBar.tsx` | Componente separado no importado; barra de presupuesto está inline en `index.tsx` |
| `wallet.tsx` | Pantalla placeholder sin funcionalidad |
| `FloatingInput.tsx` | Overlay de entrada rápida NLP; `useUIStore` ya expone `isExpenseInputOpen` — funcional |
| `chat.tsx` | Pantalla de asistente financiero; ya no se navega a ella desde el FloatingDock |
| `chatDb.ts` | Base de datos de sesiones/mensajes del chat; sin uso activo |
| `useLocalNLP.ts` | NLP local para consultas del chat; sin uso activo |

### Limitaciones funcionales (por diseño)
- **Edición de transacciones:** No existe. Solo se puede eliminar y recrear. Decisión de diseño intencional — simplifica la UX.
- **Búsqueda por voz:** El flujo directo voz → FloatingInput está parcialmente conectado; `useUIStore` expone `openExpenseInput` pero falta conectar el trigger desde el FloatingDock.
- **Sincronización metas-transacciones:** Si el usuario elimina una transacción de abono desde el Dashboard, el `savedAmount` de la meta NO se actualiza automáticamente (son independientes). Aceptable para la v1.

### Sistema de notificaciones
- `expo-notifications` no funciona en Expo Go — requiere build nativa
- Los permisos de notificación OS en Android se solicitan la primera vez que el usuario configura un presupuesto por categoría (diálogo `ConfirmDialog` antes de solicitar)
- En iOS los permisos son más estrictos; la lógica de `requestNotificationPermissions()` maneja ambas plataformas

### Riesgos técnicos
- `BlurView` no funciona consistentemente en emuladores Android
- `Appearance.setColorScheme(null)` causa crash en Android — fue removido
- `PanResponder` puede interferir con scroll horizontal si no se configura correctamente

### Proceso manual sin automatizar: link de descarga de la landing (`docs/index.html`)
El botón "Descargar APK" de la landing pública (GitHub Pages) apunta a un asset fijo de un GitHub
Release puntual (ver sección 17, subsección "Landing page y política de privacidad"). No hay CI que
actualice este link cuando sale una versión nueva de la app — es un paso manual que hay que recordar
en cada release, o la landing queda ofreciendo un APK desactualizado sin ningún aviso.

### Configuración de teclado (Android)
- `app.json` usa `softwareKeyboardLayoutMode: "resize"` para evitar que el teclado cubra contenido
- Pantallas principales (`active-expense`): `KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}` — Android lo maneja nativamente con `resize`
- Modales (`settings`, `CategoryChart`, `NewCategoryModal`): `KeyboardAvoidingView behavior="padding"` explícito — necesario porque `resize` no aplica dentro de modales

---

## 19. Reglas para Futuro Desarrollo

### Al notificar al usuario
- **No usar toasts in-app**: el sistema de toasts (`useToastStore`, `ToastContainer`, `ToastBanner`) fue eliminado. La UI no muestra notificaciones efímeras dentro de la app.
- **Eventos relevantes** (presupuesto excedido, meta cumplida, transacción detectada): usar push notifications del sistema vía `notificationService.ts` (`checkAndNotifyBudget`, `checkAndNotifyGoalCompleted`, `notifyBankTransaction`).
- **Errores críticos** que el usuario debe ver (fallo al guardar, etc.): usar `Alert.alert(title, message)` nativo de React Native.
- **Confirmaciones destructivas** (borrar datos, eliminar): usar `ConfirmDialog` (componente existente).

### Al disparar notificaciones OS
1. Usar `checkAndNotifyBudget()` después de guardar una transacción de gasto con presupuesto
2. Usar `checkAndNotifyGoalCompleted()` después de actualizar el `savedAmount` de una meta
3. Ambas funciones son no-op si `notificationsEnabled === false` o si ya se notificó ese mes/meta
4. `requestNotificationPermissions()` debe llamarse antes del primer intento de notificación

### Al agregar una nueva pantalla
1. Crear el archivo en `app/` siguiendo la convención de Expo Router
2. Registrar en el Stack de `app/_layout.tsx` si es modal
3. Usar `useTheme()` + `useMemo` + `buildStyles(theme)` para dark mode
4. Textos de UI en español
5. Iconos con `lucide-react-native`, color `theme.text` o `theme.textSub`

### Al agregar un nuevo componente
1. Crear en `src/components/ui/`
2. Props tipadas con TypeScript
3. Soporte dark mode obligatorio
4. No hardcodear colores — usar tokens del tema
5. Exportar como named export

### Al modificar la base de datos
1. Agregar migraciones en `initDatabase()` con try/catch
2. NUNCA borrar columnas existentes
3. Mantener compatibilidad con datos existentes
4. Actualizar los tipos TypeScript correspondientes

### Al extender el NLP / Categorías
1. Para nuevas categorías **preset**: agregar en `categoryPresets.ts` (EXPENSE_PRESETS o INCOME_PRESETS)
2. Para categorías **custom del usuario**: se crean desde la UI y se guardan en `useSettingsStore.userCategories`
3. Las funciones `guessCategoryEmoji()`, `getCategoryColor()`, `getCategoryName()` consultan primero `userCategories`
4. Probar con variaciones en español (acentos, sinónimos)
5. Funciones de extracción retornan `null` si no hay match

### Al agregar nuevas dependencias
1. Verificar compatibilidad con Expo SDK 55 y New Architecture
2. Ejecutar `npx expo-doctor` después de instalar
3. Preferir librerías del ecosistema Expo cuando existan
4. Documentar en este archivo si es una dependencia significativa

### Reglas inmutables
- **Moneda:** Siempre COP con puntos de miles, sin decimales
- **Idioma UI:** Todo en español
- **Datos:** 100% locales, sin nube
- **Categorías:** Dinámicas y personalizables por el usuario (presets + custom). No hay categorías fijas hardcodeadas
- **Edición de transacciones:** No se implementa (decisión de diseño)
- **Git:** Solo push manual; nunca push automático en CI
- **Formato moneda:** Regex custom, nunca `toLocaleString()`
- **Colores primarios hardcodeados:** Botones de acción primaria usan `#135BEC` fijo (no `t.accent`) para consistencia entre temas

---

## 20. Dependencias Completas

### Producción
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "expo-notifications": "~0.29.x",
  "@react-native-community/datetimepicker": "8.6.0",
  "@react-navigation/native": "^7.1.28",
  "expo": "~55.0.4",
  "expo-blur": "~55.0.8",
  "expo-constants": "~55.0.7",
  "expo-font": "~55.0.4",
  "expo-haptics": "^55.0.8",
  "expo-linear-gradient": "~55.0.8",
  "expo-linking": "~55.0.7",
  "expo-router": "~55.0.3",
  "expo-speech-recognition": "^3.1.1",
  "expo-splash-screen": "~55.0.10",
  "expo-sqlite": "^55.0.10",
  "expo-status-bar": "~55.0.4",
  "expo-symbols": "~55.0.4",
  "expo-web-browser": "~55.0.9",
  "lucide-react-native": "^0.576.0",
  "nativewind": "^4.2.2",
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-native": "0.83.2",
  "react-native-reanimated": "^4.2.1",
  "react-native-safe-area-context": "~5.6.2",
  "react-native-screens": "~4.23.0",
  "react-native-svg": "^15.15.3",
  "react-native-web": "~0.21.0",
  "react-native-worklets": "0.7.2",
  "zustand": "^5.0.11"
}
```

### Desarrollo
```json
{
  "@babel/core": "^7.29.0",
  "@babel/preset-env": "^7.29.0",
  "@types/react": "~19.2.2",
  "react-native-css-interop": "^0.2.2",
  "tailwindcss": "^3.3.2",
  "typescript": "~5.9.2"
}
```

---

*Documento generado para MyWallet v1.5.0 — Mayo 2026*
*Mantener actualizado ante cualquier cambio significativo en arquitectura, stores, DB o componentes.*
