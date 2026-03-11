# MyWallet — Ventana de Contexto del Proyecto

> **Propósito:** Este documento es la referencia técnica completa del proyecto. Cualquier desarrollador, IA o colaborador que lea este archivo tendrá TODO el contexto necesario para desarrollar, modificar o extender la aplicación sin perder consistencia.
>
> **Última actualización:** Marzo 2026 | **Versión:** 1.0.0

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
10. [Las 8 Categorías Estándar](#10-las-8-categorías-estándar)
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

- **Registro en < 3 segundos** mediante texto libre con NLP o entrada por voz
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
| **Zustand** | ^5.0.11 | Estado global (5 stores, 1 persistido) |
| **expo-sqlite** | ^55.0.10 | Base de datos local con WAL |
| **NativeWind** | ^4.2.2 | Estilos Tailwind CSS para React Native |
| **React Native Reanimated** | ^4.2.1 | Animaciones de alto rendimiento |
| **lucide-react-native** | ^0.576.0 | Iconografía (línea, 24px stroke) |
| **expo-speech-recognition** | ^3.1.1 | Reconocimiento de voz local |
| **expo-haptics** | ^55.0.8 | Feedback háptico |
| **expo-blur** | ~55.0.8 | Efectos de desenfoque |
| **expo-linear-gradient** | ~55.0.8 | Gradientes |
| **AsyncStorage** | ^2.2.0 | Persistencia de configuración de usuario |
| **react-native-svg** | ^15.15.3 | Gráficos SVG (tarjetas semanales) |

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
│   ├── settings.tsx              # Modal: configuración
│   ├── voice-input.tsx           # Modal: entrada por voz
│   └── (tabs)/
│       ├── _layout.tsx           # Tabs (barra oculta) + FloatingDock
│       ├── index.tsx             # Dashboard principal
│       └── wallet.tsx            # Placeholder (href: null)
│
├── src/                          # Lógica y componentes
│   ├── components/ui/            # Componentes reutilizables
│   │   ├── ActionPills.tsx       # Pills Gastos/Ingresos
│   │   ├── BudgetBar.tsx         # Barra de progreso presupuesto
│   │   ├── CategoryChart.tsx     # Gráfica de categorías (barras)
│   │   ├── ConfirmDialog.tsx     # Diálogo de confirmación reutilizable (danger/warning/info)
│   │   ├── CustomTabBar.tsx      # Tab bar custom (NO se usa)
│   │   ├── GuidedTour.tsx        # Overlay de onboarding paso a paso con spotlight
│   │   ├── FilterChips.tsx       # Chip de período + "Elegir mes específico"
│   │   ├── FloatingDock.tsx      # Dock flotante + FAB micrófono
│   │   ├── FloatingInput.tsx     # Overlay input/búsqueda flotante
│   │   ├── MonthPickerModal.tsx  # Selector de mes/año con montos
│   │   └── TransactionItem.tsx   # Item transacción + swipe-delete
│   │
│   ├── constants/
│   │   ├── layout.ts             # DOCK_HEIGHT, scrollBottomPadding
│   │   └── theme.ts              # COLORS, CATEGORY_MAP, CATEGORY_COLORS
│   │
│   ├── context/
│   │   └── ThemeContext.tsx       # Proveedor de tema claro/oscuro
│   │
│   ├── db/
│   │   ├── db.ts                 # SQLite: transactions, CRUD
│   │   └── queries.ts            # Consultas agregadas (totales, stats)
│   │
│   ├── features/
│   │   └── voice/useVoiceExpense.ts # Hook expo-speech-recognition
│   │
│   ├── store/
│   │   ├── useFinanceStore.ts    # Transacciones (Zustand + SQLite)
│   │   ├── useExpenseStore.ts    # Formulario gasto/ingreso en curso
│   │   ├── useSettingsStore.ts   # Config usuario (persist AsyncStorage)
│   │   ├── useUIStore.ts         # Estado de UI (búsqueda)
│   │   └── useVoiceStore.ts      # Estado de reconocimiento de voz
│   │
│   ├── theme/
│   │   └── index.ts              # AppTheme: light y dark token objects
│   │
│   └── utils/
│       ├── formatMoney.ts        # formatMoneyInput, formatMoneyDisplay, formatCOP
│       ├── nlp.ts                # parseExpenseInput (texto rápido)
│       ├── tourRefs.ts           # Registro global de refs para el GuidedTour (getTourRef, TOUR_KEYS)
│       └── voiceParser.ts        # Parseo de transcripción de voz
│
├── assets/images/                # Iconos, splash, favicon
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
│  5 stores independientes, 1 con persist(AsyncStorage)    │
├─────────────────────────────────────────────────────────┤
│  src/db/ (Persistencia — SQLite)                         │
│  Capa de datos pura, sin lógica de negocio               │
├─────────────────────────────────────────────────────────┤
│  src/features/ (Lógica de dominio)                       │
│  NLP local, integración de voz                           │
├─────────────────────────────────────────────────────────┤
│  src/components/ui/ (Componentes reutilizables)          │
│  Agnósticos a la pantalla, reciben props                 │
├─────────────────────────────────────────────────────────┤
│  src/utils/ (Utilidades puras)                           │
│  Formateo, parseo, sin side effects                      │
├─────────────────────────────────────────────────────────┤
│  src/constants/ + src/theme/ (Configuración estática)    │
│  Colores, categorías, layout, tokens de tema             │
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
├── voice-input         → Modal slide_from_bottom
├── active-expense      → Modal slide_from_bottom
├── settings            → Modal slide_from_bottom
└── +not-found          → 404
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
}
```
**Patrón:** SQLite es la fuente de verdad. El store es un cache en memoria.

### useExpenseStore (no persistido)
```typescript
interface ActiveExpense {
  amount: number
  isExpense: boolean
  categoryEmoji: string             // Emoji de la categoría (ej: "🍔")
  categoryName: string
  date: "today" | "yesterday" | "daybeforeyesterday" | "custom"
  customDate: Date | null
  note: string
  rawTranscript: string
  account: "cash" | "savings" | "credit"
  tags: string[]
}
```
**Patrón:** Estado efímero del formulario en curso. Se resetea al guardar/cerrar.

### useSettingsStore (persistido en AsyncStorage)
```typescript
{
  userName: string
  monthlyBudget: number             // 0 = no configurado
  budgetPeriod: "monthly" | "biweekly"
  budgetByCategory: Record<string, number>  // emoji → monto límite
  paymentMethods: PaymentMethod[]
  savingsGoals: SavingsGoal[]
  darkMode: "system" | "light" | "dark"
  hasCompletedOnboarding: boolean   // true tras completar o saltar el Guided Tour
  onboardingStep: number            // paso actual del tour (0-4)
}

// Acciones adicionales
setOnboardingStep(step: number): void
completeOnboarding(): void
```

#### Helpers exportados (funciones puras)
```typescript
getEffectiveBudget(monthlyBudget: number, budgetPeriod: "monthly" | "biweekly"): number
// Retorna monthlyBudget / 2 si biweekly, o monthlyBudget si monthly

getEffectiveCategoryBudgets(
  budgetByCategory: Record<string, number>,
  budgetPeriod: "monthly" | "biweekly"
): Record<string, number>
// Retorna cada presupuesto de categoría dividido entre 2 si biweekly
```

**Persistencia:** `zustand/middleware/persist` con `createJSONStorage(() => AsyncStorage)`, key `"mywallet-settings"`. Los campos `hasCompletedOnboarding` y `onboardingStep` también se persisten.

### useUIStore (no persistido)
```typescript
{
  searchOpen: boolean
  searchQuery: string
}
```

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
  errorMessage: string
}
```

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
  tags            TEXT NOT NULL DEFAULT ''  -- JSON: '["#trabajo","#comida"]'
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
| `insertTransaction(amount, desc, emoji, tags)` | INSERT con fecha local ISO |
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
- hoy, ayer, anteayer/antier

**Extracción de categoría:**
- Basado en CATEGORY_MAP con ~70 palabras clave → 8 categorías de gasto + 5 de ingreso

**Post-procesamiento:**
- `normalizeMoneyText(text)`: convierte `$40,000` → `$40.000` en el texto
- `replaceAmountInNote(text, amount)`: convierte `"cinco millones 400 mil"` → `"$5.400.000"` en la nota

### nlp.ts — parseExpenseInput

Parseo simple para el campo de texto del formulario:
- Busca el primer número en el texto → monto
- Usa `guessCategoryEmoji(description)` para categoría
- Más ligero, se ejecuta en cada keystroke

### Reglas para extender NLP
- Mantener offline: **NUNCA** llamar APIs externas
- Los retornos de `extractCategory` y `extractDate` son `null` si no hay match (no forzar defaults)
- Usar `\b` (word boundaries) para evitar falsos positivos en regex

---

## 10. Categorías

### 10.1 Categorías de Gasto (8)

Conjunto fijo. Visible en el formulario de gastos, gráfica en modo gastos y búsqueda:

| Emoji | Nombre | Color Accent | Palabras Clave NLP |
|-------|--------|-------------|-------------------|
| 🍔 | Comida | `#D2601A` | restaurante, almuerzo, cena, pizza, café, mercado, supermercado, domicilio |
| 🚗 | Transporte | `#1565C0` | uber, taxi, bus, metro, gasolina, transporte, moto |
| 🏠 | Hogar | `#D97706` | arriendo, luz, agua, gas, internet, servicios, reparación |
| 🛍️ | Compras | `#C2185B` | ropa, zara, shopping, gadget, tecnología, amazon |
| 🏥 | Salud | `#C62828` | farmacia, médico, doctor, hospital, clínica, medicamento |
| 🎮 | Entretenimiento | `#6D28D9` | netflix, spotify, cine, juego, concierto, teatro, suscripción |
| 🎓 | Educación | `#059669` | curso, libro, universidad, clase, colegio, capacitación |
| 👤 | Personal | `#475569` | personal, peluquería, barbería, belleza, spa, cuidado |

### 10.2 Categorías de Ingreso (5)

Visible en el formulario de ingresos y en la gráfica cuando el pill "↑ Ingresos" está activo:

| Emoji | Nombre | Color Accent | Palabras Clave NLP |
|-------|--------|-------------|-------------------|
| 💼 | Salario | Verde `#16A34A` | salario, sueldo, nomina, quincena, mensualidad, empresa |
| 💻 | Freelance | Azul `#0284C7` | freelance, honorarios, proyecto, cliente |
| 📈 | Inversiones | Esmeralda `#059669` | inversión, dividendos, rendimientos, intereses, acciones |
| 🎁 | Extra | Naranja `#D97706` | extra, regalo, bono, reembolso, devolución, premio |
| 🏢 | Negocio | Índigo `#4F46E5` | negocio, local, venta, factura |

### Fuentes de verdad
- **`src/constants/theme.ts`**: `CATEGORY_MAP`, `EMOJI_TO_CATEGORY_NAME`, `CATEGORY_COLORS`, `ALL_CATEGORY_EMOJIS`, `ALL_INCOME_EMOJIS`
- **`src/utils/voiceParser.ts`**: Mapa duplicado para NLP de voz (mantener sincronizado)
- **`app/active-expense.tsx`**: `CATEGORY_OPTIONS` (gastos) y `INCOME_CATEGORY_OPTIONS` (ingresos)

### Regla
Si se agrega/modifica una categoría, actualizar en **todos** los archivos anteriores + la documentación del usuario.

---

## 11. Componentes UI Reutilizables

### CategoryChart
- Gráfica de barras verticales con scroll horizontal
- **Modo gastos:** porcentaje según presupuesto (o 50% fijo), colores de alerta (base/ámbar/rojo)
- **Modo ingresos** (prop `isIncomeMode`): barras verdes proporcionales al mayor ingreso de categoría; sin presupuesto ni "Editar presupuesto" en popup
- Ghost tracks para categorías vacías (gris con borde punteado)
- **Tap corto en columna:** badge animado (fade + slide up) con emoji + nombre de la categoría, se auto-descarta en 1.6s
- Long-press: popup con "Editar presupuesto ↑ / Nueva transacción ↓" (en ingresos solo "↓")
- `containerRef` + `measure()` para calcular posición absoluta del badge en pantalla

### FloatingDock
- Dock inferior que reemplaza la tab bar nativa
- Contiene: botón +, lupa, FAB micrófono (azul, prominente)
- El botón + abre un menú popup con opciones Gasto/Ingreso
- Fondo semi-transparente oscuro al abrir menú

### TransactionItem
- Muestra emoji, descripción (truncada), fecha, monto formateado
- **Modo claro:** fondo blanco (`#FFFFFF`) con sombra sutil (card-like)
- **Modo oscuro:** fondo `t.itemBg`
- Swipe-to-delete (PanResponder + Animated): deslizar izquierda revela botón papelera
- Animación de entrada: `FadeInDown`
- Gastos en negro con `−`, ingresos en verde con `+`

### FilterChips
- **Un solo chip** de período: opciones rápidas ("Hoy"…"Todo") + "📅 Elegir mes específico..." al fondo del sheet
- Props: `period`, `periodLabel?` (label dinámico, ej: "Abr 2025"), `onPeriodChange`, `onOpenMonthPicker?`
- El chip de categoría fue eliminado — simplifica la UI del Dashboard; el filtrado por categoría se hace desde la gráfica o la búsqueda
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
- Usa `effectiveBudget` (presupuesto mensual / 2 si quincenal) vía `getEffectiveBudget()`

### ActionPills
- Pills "↓ Gastos" / "↑ Ingresos" para filtrar la vista
- Sin selección = todos los movimientos
- Gastos: fondo rojo suave al seleccionar
- Ingresos: fondo verde suave al seleccionar
- Re-tap desactiva el filtro

---

## 12. Pantallas y Rutas

### Dashboard (`app/(tabs)/index.tsx`)
- Balance neto (tipografía 38px, weight 800)
- Pills inline (Gastos/Ingresos) con toggle por tipo
- Barra de presupuesto inline (condicional: `monthlyBudget > 0`, sin filtro de tipo, solo período actual). Usa `effectiveBudget` vía `getEffectiveBudget()` (auto-dividido si quincenal)
- FilterChips — un solo chip de período con `periodLabel` y `onOpenMonthPicker`
- CategoryChart (gráfica de barras) — recibe `isIncomeMode` y `allEmojis` contextual. Los presupuestos de categoría se pasan mediante `getEffectiveCategoryBudgets()` (también divididos si quincenal)
- **`FlatList`** reemplaza `ScrollView + map` — chart y cabecera van en `ListHeaderComponent`, estado vacío en `ListEmptyComponent`; `renderItem` en `useCallback`
- **`PeriodFilter` tipo unificado:** discriminante con 4 variantes (`quick`, `month`, `year`, `all`) — reemplaza los estados separados `period` + `pickerYear` + `pickerMonth`
- **`applyPeriodFilter()`:** función pura fuera del componente que maneja los 4 casos de filtrado por fecha
- `MonthPickerModal` — integrado con `PeriodFilter` directamente (`onApply` construye el tipo correcto)
- `filteredTransactions` respeta `PeriodFilter` (período rápido, mes específico, año, o todo)
- `categoryStats` e `incomeStats` usan `filteredTransactions` (dinámicos al período seleccionado)
- Presupuesto solo visible si `isCurrentPeriod === true`
- **Estado "período vacío":** cuando `filteredTransactions.length === 0` y es el período actual, muestra barras fantasma (opacity 0.18) con mensaje centrado: "Nuevo mes, ¡comienza ahora!" o "Nueva quincena, ¡comienza ahora!". Si es un período pasado sin datos: "Sin registros en este período"
- Barra de búsqueda: `keyboardExtraAnim` sube la barra sobre el teclado al abrirse
- **Guided Tour:** integración con `GuidedTour` (5 pasos, solo primera vez). Refs de targets registrados en `tourRefs.ts`. El flujo alterna entre Dashboard y Settings. Persistido con `hasCompletedOnboarding` + `onboardingStep`
- **Eliminado:** chip de categoría, estilos de metas de ahorro, ScrollView+map

### Active Expense (`app/active-expense.tsx`)
- Título dinámico: "Nuevo Gasto" / "Nuevo Ingreso"
- Monto grande con tamaño adaptable (36-64px según dígitos)
- Campo de descripción con NLP en tiempo real
- Selectores: Fecha, Categoría (grid contextual: `CATEGORY_OPTIONS` para gastos, `INCOME_CATEGORY_OPTIONS` para ingresos), Cuenta
- Tags sugeridos + custom
- Botón ✓ para guardar (vibración + navegar atrás)
- `adjustsFontSizeToFit` como fallback para montos enormes

### Voice Input (`app/voice-input.tsx`)
- Orb animado que indica estado de escucha
- Transcripción en tiempo real con animación palabra por palabra (AnimatedWords)
- Estados: idle → listening → processing → done
- Al completar: navega a active-expense con datos pre-llenados
- Delay de 1000ms antes de navegar

### Settings (`app/settings.tsx`)
- **Control financiero (orden de opciones):**
  1. **Período de pago** — Mensual / Quincenal (se muestra primero)
  2. **Ingreso mensual** — etiqueta dinámica: "Ingreso quincenal" cuando biweekly está seleccionado. Subtítulo muestra el monto efectivo del período + referencia "Mensual: $X" cuando es quincenal. El modal siempre pide el monto mensual con nota "Se divide automáticamente para cada quincena"
- Métodos de pago → modal full-screen
- Presupuesto por categoría → modal full-screen
- **Metas de ahorro:** `NuevaMetaModal` (crear), `AbonarMetaModal` (abonar), `SavingsGoalsSection` con `SwipeableGoalItem` (swipe-to-delete izquierda revela botón papelera rojo)
- Apariencia → selector dark mode
- Sistema: exportar CSV, limpiar datos
- **Confirmaciones:** Todas las alertas usan `ConfirmDialog` (componente custom con animación y variantes) en lugar de `Alert.alert` nativo — limpiar datos (`danger`), eliminar método de pago (`danger`), mínimo un método (`info`), error al exportar (`warning`)
- **Guided Tour:** paso 2 hace spotlight en la fila "Ingreso mensual"; paso 3 hace spotlight en el botón ← (volver) tras guardar el ingreso

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
| Entrada de items | TransactionItem | `FadeInDown` de Reanimated |
| Palabra por palabra | voice-input AnimatedWords | `FadeIn.duration(220)` por palabra nueva |
| Barra de presupuesto | BudgetBar | `useSharedValue` + `withTiming` |
| Orb de voz | voice-input VoiceOrb | `withRepeat` + `withTiming` (pulsación) |
| Feedback háptico | active-expense (guardar) | `expo-haptics` `notificationAsync(success)` |
| Swipe-to-delete transacciones | TransactionItem | `PanResponder` + `Animated` de RN |
| Swipe-to-delete metas | SwipeableGoalItem (settings) | `PanResponder` + `Animated` de RN |
| Badge nombre categoría | CategoryChart | `Animated.Value` fade + translateY, auto-descarta 1.6s |
| Colapso de gráfica al scroll | Dashboard (index.tsx) | `Animated.event` → `scrollY` interpola `maxHeight` + `opacity` del chart wrapper |
| Diálogo de confirmación | ConfirmDialog | Spring scale (0.85→1) + fade-in opacity, 3 variantes (danger/warning/info) |
| Spotlight de onboarding | GuidedTour | Fade-in overlay oscuro con cutout circular + spring scale del tooltip. Transición animada entre pasos |

### Reglas para animaciones
- Usar `Reanimated` para animaciones de layout y gestos complejos
- Usar `Animated` de RN solo para `PanResponder` (incompatible con Reanimated en algunos casos)
- Duraciones estándar: entrada 200-300ms, feedback 100-150ms
- Easing por defecto: `Easing.out(Easing.cubic)`

---

## 15. Convenciones de Código

### Nomenclatura
| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes | PascalCase | `CategoryChart.tsx` |
| Hooks | camelCase con `use` | `useVoiceExpense.ts` |
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
6. **Derivación de presupuesto efectivo** — Los helpers `getEffectiveBudget()` y `getEffectiveCategoryBudgets()` se exportan desde `useSettingsStore` como funciones puras. El Dashboard los invoca con los valores del store para obtener montos ajustados al período (mensual o quincenal). No se almacena un campo derivado; se calcula en cada render

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

---

## 18. Problemas Conocidos y Deuda Técnica

### Código inactivo
| Archivo | Problema |
|---------|---------|
| `CustomTabBar.tsx` | Definido pero nunca utilizado (tabs usan `tabBar={() => null}`) |
| `ActionPills.tsx` | Componente separado no importado; pills están inline en `index.tsx` |
| `BudgetBar.tsx` | Componente separado no importado; barra de presupuesto está inline en `index.tsx` |
| `wallet.tsx` | Pantalla placeholder sin funcionalidad |
| `useVoiceExpense.ts` | Depende de `openExpenseInput` que no existe en `useUIStore` |
| `FloatingInput.tsx` | `isExpenseInputOpen` no existe en el store → componente nunca activo |
| `chat.tsx` | Pantalla de asistente financiero; ya no se navega a ella desde el FloatingDock |
| `chatDb.ts` | Base de datos de sesiones/mensajes del chat; sin uso activo |
| `useLocalNLP.ts` | NLP local para consultas del chat; sin uso activo |

### Limitaciones funcionales (por diseño)
- **Edición de transacciones:** No existe. Solo se puede eliminar y recrear. Decisión de diseño intencional — simplifica la UX.
- **Búsqueda por voz:** El flujo directo voz → FloatingInput está desconectado.

### Riesgos técnicos
- `BlurView` no funciona consistentemente en emuladores Android
- `Appearance.setColorScheme(null)` causa crash en Android — fue removido
- `PanResponder` puede interferir con scroll horizontal si no se configura correctamente

### Configuración de teclado (Android)
- `app.json` usa `softwareKeyboardLayoutMode: "resize"` para evitar que el teclado cubra contenido
- Pantallas principales (`active-expense`): `KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}` — Android lo maneja nativamente con `resize`
- Modales (`settings`, `CategoryChart`): `KeyboardAvoidingView behavior="padding"` explícito — necesario porque `resize` no aplica dentro de modales

---

## 19. Reglas para Futuro Desarrollo

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

### Al extender el NLP
1. Agregar palabras clave en `CATEGORY_MAP` (theme.ts) Y `voiceParser.ts`
2. Probar con variaciones en español (acentos, sinónimos)
3. Usar `\b` para word boundaries en regex
4. Funciones de extracción retornan `null` si no hay match

### Al agregar nuevas dependencias
1. Verificar compatibilidad con Expo SDK 55 y New Architecture
2. Ejecutar `npx expo-doctor` después de instalar
3. Preferir librerías del ecosistema Expo cuando existan
4. Documentar en este archivo si es una dependencia significativa

### Reglas inmutables
- **Moneda:** Siempre COP con puntos de miles, sin decimales
- **Idioma UI:** Todo en español
- **Datos:** 100% locales, sin nube
- **Categorías de gasto:** Las 8 estándar son fijas
- **Categorías de ingreso:** Las 5 estándar son fijas
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

*Documento generado para MyWallet v1.0.0 — Marzo 2026*
*Mantener actualizado ante cualquier cambio significativo en arquitectura, stores, DB o componentes.*
