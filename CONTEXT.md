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
│       ├── chat.tsx              # Asistente chat NLP
│       └── wallet.tsx            # Placeholder (href: null)
│
├── src/                          # Lógica y componentes
│   ├── components/ui/            # Componentes reutilizables
│   │   ├── ActionPills.tsx       # Pills Gastos/Ingresos
│   │   ├── BudgetBar.tsx         # Barra de progreso presupuesto
│   │   ├── CategoryChart.tsx     # Gráfica de categorías (barras)
│   │   ├── CustomTabBar.tsx      # Tab bar custom (NO se usa)
│   │   ├── FilterChips.tsx       # Chips período/categoría
│   │   ├── FloatingDock.tsx      # Dock flotante + FAB micrófono
│   │   ├── FloatingInput.tsx     # Overlay input/búsqueda flotante
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
│   │   ├── queries.ts            # Consultas agregadas (totales, stats)
│   │   └── chatDb.ts             # SQLite: chat_sessions, chat_messages
│   │
│   ├── features/
│   │   ├── chat/useLocalNLP.ts   # NLP local para consultas en español
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
5. **Sin APIs externas:** Todo funciona offline (NLP, voz, chat, cálculos)

---

## 5. Sistema de Navegación

### Stack Principal (`app/_layout.tsx`)

```
Stack
├── (tabs)              → Tab layout (barra oculta)
│   ├── index           → Dashboard
│   ├── chat            → Asistente financiero
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
- **Micrófono FAB** → navega a `voice-input`
- **Lupa** → activa modo búsqueda en `FloatingInputOverlay`
- **Chat** → navega a tab `chat`

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
}
```
**Persistencia:** `zustand/middleware/persist` con `createJSONStorage(() => AsyncStorage)`, key `"mywallet-settings"`.

### useUIStore (no persistido)
```typescript
{
  searchOpen: boolean
  searchQuery: string
}
```

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

#### Tabla `chat_sessions`
```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### Tabla `chat_messages`
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role       TEXT NOT NULL,       -- "user" | "assistant"
  text       TEXT NOT NULL,
  card_json  TEXT,                -- JSON para tarjetas especiales (WeeklySummary)
  created_at TEXT NOT NULL
);
```

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
- Ingreso: recibí, ingresé, cobré, sueldo, salario, freelance

**Extracción de fecha:**
- hoy, ayer, anteayer/antier

**Extracción de categoría:**
- Basado en CATEGORY_MAP con ~50 palabras clave → 8 categorías

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

## 10. Las 8 Categorías Estándar

Las categorías son un conjunto **fijo e inmutable**. Toda la app depende de esta lista:

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

### Fuentes de verdad
- **`src/constants/theme.ts`**: `CATEGORY_MAP`, `EMOJI_TO_CATEGORY_NAME`, `CATEGORY_COLORS`, `ALL_CATEGORY_EMOJIS`
- **`src/utils/voiceParser.ts`**: Mapa duplicado para NLP de voz (mantener sincronizado)

### Regla
Si se agrega/modifica una categoría, actualizar en AMBOS archivos + la documentación del usuario.

---

## 11. Componentes UI Reutilizables

### CategoryChart
- Gráfica de barras verticales con scroll horizontal
- Ghost tracks para categorías vacías
- Long-press: popup con "Editar presupuesto" / "Nueva transacción"
- Colores de alerta: base (< 70%), ámbar (70-89%), rojo (≥ 90%)
- Sin presupuesto: barra fija al 50% con color base

### FloatingDock
- Dock inferior que reemplaza la tab bar nativa
- Contiene: botón +, FAB micrófono (azul, prominente), lupa, chat
- El botón + abre un menú popup con opciones Gasto/Ingreso
- Fondo semi-transparente oscuro al abrir menú

### TransactionItem
- Muestra emoji, descripción (truncada), fecha, monto formateado
- Swipe-to-delete (PanResponder + Animated): deslizar izquierda revela botón papelera
- Animación de entrada: `FadeInDown`
- Gastos en negro con `−`, ingresos en verde con `+`

### FilterChips
- Chip de período: "Hoy", "Ayer", "Esta semana", "Este mes", "Este año", "Todo"
- Chip de categoría: las 8 categorías + "Todas"
- Ambos abren un Modal bottom-sheet al tocar

### BudgetBar
- Barra de progreso animada (Reanimated)
- Muestra `X% de $presupuesto`
- Se vuelve roja al superar 90%
- Solo visible si `monthlyBudget > 0`

### ActionPills
- Pills "↓ Gastos" / "↑ Ingresos" para filtrar la vista
- Sin selección = todos los movimientos
- Gastos: fondo rojo suave al seleccionar
- Ingresos: fondo verde suave al seleccionar
- Re-tap desactiva el filtro

---

## 12. Pantallas y Rutas

### Dashboard (`app/(tabs)/index.tsx`)
- Balance neto (grande)
- ActionPills (Gastos/Ingresos)
- BudgetBar (condicional)
- FilterChips (período + categoría)
- CategoryChart (gráfica de barras)
- Lista de TransactionItems
- Botón "Ver más" → abre HistoryDrawer (modal full-screen)

### Active Expense (`app/active-expense.tsx`)
- Título dinámico: "Nuevo Gasto" / "Nuevo Ingreso"
- Monto grande con tamaño adaptable (36-64px según dígitos)
- Campo de descripción con NLP en tiempo real
- Selectores: Fecha, Categoría (grid), Cuenta
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
- Control financiero: presupuesto mensual, período
- Métodos de pago → modal full-screen
- Presupuesto por categoría → modal full-screen
- Apariencia → selector dark mode
- Sistema: exportar CSV, limpiar datos

### Chat (`app/(tabs)/chat.tsx`)
- Asistente financiero local con NLP
- Preguntas en español sobre gastos (hoy, mes, semana, etc.)
- Tarjeta visual semanal con gráfico SVG
- Historial de sesiones en panel lateral

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
| Swipe-to-delete | TransactionItem | `PanResponder` + `Animated` de RN |

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

1. **FlatList** para listas largas (no ScrollView con map)
2. **`useMemo`** para cálculos derivados costosos
3. **`useCallback`** para handlers pasados como props
4. **Animaciones en UI thread** — Reanimated worklets para 60fps

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
| `wallet.tsx` | Pantalla placeholder sin funcionalidad |
| `useVoiceExpense.ts` | Depende de `openExpenseInput` que no existe en `useUIStore` |
| `FloatingInput.tsx` | `isExpenseInputOpen` no existe en el store → componente nunca activo |

### Limitaciones funcionales
- **Edición de transacciones:** No existe. Solo se puede eliminar y recrear
- **budgetPeriod quincenal:** El valor se guarda pero NO afecta los cálculos de la barra de presupuesto
- **Búsqueda por voz:** El flujo directo voz → FloatingInput está desconectado
- **Metas de ahorro:** El store las soporta pero no hay UI para gestionarlas

### Riesgos técnicos
- `BlurView` no funciona consistentemente en emuladores Android
- `Appearance.setColorScheme(null)` causa crash en Android — fue removido
- `PanResponder` puede interferir con scroll horizontal si no se configura correctamente

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
- **Categorías:** Las 8 estándar son fijas
- **Git:** Solo push manual; nunca push automático en CI
- **Formato moneda:** Regex custom, nunca `toLocaleString()`

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
