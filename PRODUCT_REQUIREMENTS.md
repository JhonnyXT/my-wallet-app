# MyWallet — Requerimientos de Producto

> **Versión:** 1.5.0 | **Plataforma:** Android (iOS futuro) | **Moneda:** COP | **Idioma UI:** Español

---

## 1. Visión y Filosofía del Producto

**MyWallet** es una aplicación personal de control financiero diseñada para eliminar la fricción del registro manual de gastos e ingresos.

- **Principio de diseño:** Minimalismo funcional — cero fricción, registro en menos de 3 segundos
- **Estética:** Interfaz limpia inspirada en Google Stitch Design System y MonAI
- **Dato fundamental:** 100% offline, datos locales en SQLite, sin servidores ni suscripciones
- **Público objetivo:** Usuarios en Colombia que quieren controlar su dinero de forma rápida, simple y visual

---

## 2. Arquitectura de Información

La estructura es plana y directa. No hay menús de hamburguesa ni navegaciones complejas.

### 2.1 Dashboard (Pantalla Principal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Balance Neto | Tipografía grande: `Ingresos - Gastos` del período | ✅ Implementado |
| Pills Gastos/Ingresos | Filtran toda la vista por tipo (rojo suave / verde suave) | ✅ Implementado |
| Barra de Presupuesto | Progreso del gasto vs presupuesto mensual | ✅ Implementado |
| Estado "período vacío" | Si no hay transacciones en el período actual: barras fantasma (opacity 0.18) + "Nuevo mes, ¡comienza ahora!". Período pasado sin datos: "Sin registros en este período" | ✅ Implementado |
| Filtro de período | Un solo chip: período rápido (Hoy/Semana/Quincena/Mes/Año/Todo) + "Elegir mes específico" | ✅ Implementado |
| Selector de mes/año | Modal con grid de meses, montos por mes, pills de año | ✅ Implementado |
| Gráfica de Categorías | Barras verticales con scroll horizontal, ghost tracks, alertas por color | ✅ Implementado |
| Lista de Transacciones | `FlatList` con items tipo tarjeta (fondo blanco + sombra en modo claro) y swipe-to-delete | ✅ Implementado |
| Dock Flotante | FAB micrófono, botón +, lupa — reemplaza tab bar | ✅ Implementado |
| Detalle de transacción | Modal centrado estilo Stitch al hacer **tap** en un item: emoji, monto, categoría, tipo, cuenta, fecha, hora (12h), descripción, tags | ✅ Implementado |
| Animación scroll de gráfica | Las barras se comprimen progresivamente al hacer scroll (Reanimated `interpolate`). Las etiquetas hacen crossfade de vertical a horizontal compacto. Gráfica y lista en scroll unificado (`FlatList` + `ListHeaderComponent`) | ✅ Implementado |
| Odómetro de valores | `RollingNumber`: cada dígito tiene su columna 0-9 animada con Reanimated. Separadores de miles COP con fade-in/out. Usado en Balance neto + Pills de gastos/ingresos | ✅ Implementado |

### 2.2 Nuevo Gasto / Nuevo Ingreso (Modal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Título dinámico | "Nuevo Gasto" o "Nuevo Ingreso" según origen | ✅ Implementado |
| Monto grande | Tamaño adaptable según dígitos (36-64px) con `adjustsFontSizeToFit` | ✅ Implementado |
| Campo de texto NLP | Detecta monto, categoría, fecha en tiempo real | ✅ Implementado |
| Selectores rápidos | Fecha (Hoy/Calendario), Categoría (grid dinámico + ítem "Nueva" para crear inline), Cuenta (método de pago guardado en transacción) | ✅ Implementado |
| Tags | Sugeridos (#viaje, #trabajo, etc.) + custom | ✅ Implementado |
| Guardar | Botón ✓ + vibración háptica + regresa al Dashboard | ✅ Implementado |
| Auto-formato | Puntos de miles automáticos mientras se escribe | ✅ Implementado |

### 2.3 Entrada por Voz (Modal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Orb animado | Indica estado de escucha con pulsación | ✅ Implementado |
| Transcripción en tiempo real | Animación palabra por palabra (FadeIn) | ✅ Implementado |
| NLP de voz | Detecta monto (incluye millones), tipo, fecha, categoría | ✅ Implementado |
| Conversión texto→número | "cinco millones 400 mil" → "$5.400.000" en la nota | ✅ Implementado |
| Auto-stop | Se detiene tras 2s de silencio | ✅ Implementado |
| Transición (single) | 1s de delay → abre formulario con datos pre-llenados | ✅ Implementado |
| **Multi-transacción por voz** | `processMultiVoiceInput` detecta ≥2 montos (dígitos o palabras: "treinta mil", "quince mil"); `setPendingBatch` + `router.replace("/voice-batch-review")` → pantalla de revisión | ✅ Implementado |
| **Pantalla "Revisar registros"** (`voice-batch-review`) | FlatList de tarjetas editables (swipe-left elimina, ✏️ abre EditItemSheet). "Añadir registro manual" → `active-expense?from=batch-review` → registro vuelve como tarjeta sin guardar en DB. Footer: resumen + "Guardar todo" → `addTransactionBatch` → Dashboard. Errores con `Alert.alert` nativo | ✅ Implementado |

### 2.4 Configuración (Modal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Ingreso mensual | Cuánto dinero se tiene disponible al mes para gastar. 0 = sin presupuesto | ✅ Implementado |
| Métodos de pago | Agregar/editar/eliminar (modal full-screen) | ✅ Implementado |
| Presupuesto por categoría | Límite por cada categoría de gasto del usuario (modal full-screen) | ✅ Implementado |
| Metas de ahorro | Crear/abonar/eliminar metas; eliminar deslizando a la izquierda (swipe-to-delete). Al abonar se crea transacción de gasto automáticamente (con emoji de la meta, tag #ahorro) | ✅ Implementado |
| Apariencia | Sistema / Claro / Oscuro (dark mode completo) | ✅ Implementado |
| Exportar datos | CSV con columnas id/fecha/tipo/descripcion/categoria/monto/metodo_pago/tags. Compartido con `Share` nativo de React Native (sin módulos externos) | ✅ Implementado |
| Limpiar datos | Elimina todas las transacciones (con confirmación vía diálogo custom animado) | ✅ Implementado |

### 2.7 Sistema de Notificaciones (dos capas)

#### Capa 1 — Notificaciones OS locales (`expo-notifications`)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Servicio | `src/services/notificationService.ts` — `requestNotificationPermissions`, `checkAndNotifyBudget`, `checkAndNotifyGoalCompleted` | ✅ Implementado |
| Permiso | Se solicita la primera vez que el usuario configura un presupuesto por categoría (vía `ConfirmDialog` previo) | ✅ Implementado |
| Anti-duplicación presupuesto | `budgetNotifiedMonth: Record<string, string>` en `useSettingsStore` — una sola notificación por categoría por mes | ✅ Implementado |
| Anti-duplicación metas | `goalNotifiedIds: string[]` en `useSettingsStore` — una sola notificación por meta | ✅ Implementado |
| Limpieza automática | `clearExpiredBudgetNotifications()` se ejecuta en el bootstrap de la app (`app/_layout.tsx`) para limpiar flags de meses anteriores | ✅ Implementado |

#### Capa 2 — Banners in-app

**Eliminado.** El sistema de toasts in-app (`useToastStore`, `ToastBanner`, `ToastContainer`) fue retirado. Los eventos relevantes se notifican exclusivamente vía push notifications del sistema (Capa 1). Errores críticos usan `Alert.alert` nativo y confirmaciones destructivas usan `ConfirmDialog`.

### 2.8 Guided Tour / Onboarding (primera vez)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Componente | `GuidedTour.tsx` — overlay reutilizable con spotlight paso a paso, cutout circular y tooltip animado | ✅ Implementado |
| Registro de refs | `tourRefs.ts` — registro global de refs (`getTourRef`, `TOUR_KEYS`) para localizar targets entre pantallas | ✅ Implementado |
| Paso 1 (Dashboard) | Spotlight en ⚙️ botón de ajustes → "¡Bienvenido! Configura tu ingreso mensual" | ✅ Implementado |
| Paso 2 (Settings) | Spotlight en fila "Ingreso mensual" → "Ingresa cuánto ganas al mes" | ✅ Implementado |
| Paso 3 (Settings) | Tras guardar, spotlight en ← botón volver → "¡Listo! Vuelve al inicio" | ✅ Implementado |
| Paso 4 (Dashboard) | Spotlight en FAB micrófono → "Registra gastos con tu voz" | ✅ Implementado |
| Paso 5 (Dashboard) | Spotlight en botón + → "También puedes registrar manualmente" | ✅ Implementado |
| Persistencia | `hasCompletedOnboarding` + `onboardingStep` en AsyncStorage. Se puede saltar en cualquier paso con "Omitir" | ✅ Implementado |

### 2.5 Selector de Mes/Año (`MonthPickerModal`)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Acceso | Chip de período → "Elegir mes específico..." al fondo del sheet | ✅ Implementado |
| Pills de año | Dinámicos desde el año de la primera transacción hasta el actual | ✅ Implementado |
| "Todo el tiempo" | Limpia el filtro personalizado y regresa a la vista sin restricción de fecha | ✅ Implementado |
| Grid de meses | 3 columnas × 4 filas (Ene–Dic) con monto compacto del período debajo | ✅ Implementado |
| Mes seleccionado | Fondo azul claro `#DBEAFE`, texto `#1D4ED8` | ✅ Implementado |
| Meses futuros | Deshabilitados (opacidad 0.3) | ✅ Implementado |
| Estado draft | Cambios solo se aplican al tocar "Aplicar"; X descarta sin cambiar | ✅ Implementado |
| Efecto en Dashboard | Gráfica + lista + balance reflejan el período elegido | ✅ Implementado |
| Chip activo | Muestra "Abr 2025", "2025" o el período normal según selección | ✅ Implementado |

### 2.6 Gráfica de Categorías (Interacciones Avanzadas)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Barras verticales (gastos) | Porcentaje según presupuesto o 50% fijo si no hay límite | ✅ Implementado |
| Barras verticales (ingresos) | Barras verdes proporcionales al mayor ingreso de categoría (pill ↑ Ingresos activo) | ✅ Implementado |
| Alertas por color | Base (< 70%), ámbar (70-89%), rojo (≥ 90%) — solo en modo gastos | ✅ Implementado |
| Ghost tracks | Categorías sin movimientos visibles en gris | ✅ Implementado |
| Tap en columna | Badge animado con emoji + nombre de la categoría sobre la columna tocada | ✅ Implementado |
| Long-press popup (gastos) | Etiqueta ↑ dinámica: "AGREGAR PRESUPUESTO" si no hay límite, "EDITAR PRESUPUESTO" si existe. Restante (centro) / Nueva transacción ↓ | ✅ Implementado |
| Long-press popup (ingresos) | Solo "Nueva transacción ↓" (sin fila de presupuesto) | ✅ Implementado |
| Mini-popup presupuesto | Editar límite inline con preview de barra | ✅ Implementado |
| Scroll horizontal | Deslizar para ver todas las categorías | ✅ Implementado |

---

## 3. Historias de Usuario

### Épica 1: Registro sin Fricción

| ID | Historia | Estado |
|----|---------|--------|
| HU 1.1 | Como usuario, quiero escribir frases como "Uber 15 mil" en un campo de texto y que se registre automáticamente el monto, categoría y descripción | ✅ |
| HU 1.2 | Como usuario, quiero que el sistema extraiga el monto, la categoría y la fecha de mi texto libre en tiempo real | ✅ |
| HU 1.3 | Como usuario, quiero registrar gastos por voz diciendo "Gasté treinta mil en almuerzo" y que se procese automáticamente | ✅ |
| HU 1.4 | Como usuario, quiero que al decir montos en palabras ("cinco millones 400 mil"), la nota muestre la cifra formateada ($5.400.000) | ✅ |
| HU 1.7 | Como usuario, quiero decir varios gastos en un mismo input de voz ("gasté treinta mil en almuerzo y quince mil en café") y que aparezca una pantalla de revisión donde pueda editar, eliminar o agregar más antes de guardar | ✅ |
| HU 1.8 | Como usuario, quiero poder deshacer un lote de transacciones registradas por voz con un solo botón "Deshacer todo" durante 8 segundos, disponible tras confirmar en "Revisar registros" | ✅ |
| HU 1.9 | Como usuario, quiero agregar un registro manual desde "Revisar registros" y que ese registro aparezca como tarjeta adicional en la lista de revisión (sin guardarse aún en la base de datos) | ✅ |
| HU 1.5 | Como usuario, quiero elegir rápidamente entre Gasto e Ingreso desde el botón + del dock flotante | ✅ |
| HU 1.6 | Como usuario, quiero que los montos se formateen automáticamente con puntos de miles mientras escribo | ✅ |

### Épica 2: Visualización y Control

| ID | Historia | Estado |
|----|---------|--------|
| HU 2.1 | Como usuario, quiero ver mi balance neto (ingresos - gastos) con tipografía grande y clara | ✅ |
| HU 2.2 | Como usuario, quiero una barra de progreso que compare mis gastos con mi presupuesto mensual | ✅ |
| HU 2.3 | Como usuario, quiero filtrar por período (hoy, semana, mes, año, todo, o mes/año específico) | ✅ |
| HU 2.4 | Como usuario, quiero una gráfica de barras que muestre cuánto gasté en cada categoría con alertas visuales | ✅ |
| HU 2.5 | Como usuario, quiero filtrar la vista completa (gráfica + lista) tocando los pills de Gastos o Ingresos | ✅ |
| HU 2.6 | Como usuario, quiero configurar presupuestos por categoría y ver alertas cuando me acerque al límite | ✅ |
| HU 2.7 | Como usuario, quiero dejar presionada una columna de la gráfica para editar su presupuesto (o agregarlo si no existe) o crear una transacción en esa categoría | ✅ |
| HU 2.8 | Como usuario, quiero seleccionar un mes y año específico para ver los movimientos y la gráfica de ese período | ✅ |

### Épica 3: Gestión de Transacciones

| ID | Historia | Estado |
|----|---------|--------|
| HU 3.1 | Como usuario, quiero eliminar una transacción deslizando hacia la izquierda en la lista | ✅ |
| HU 3.2 | Como usuario, quiero buscar transacciones por descripción, categoría o tag | ✅ |
| HU 3.3 | Como usuario, quiero ver el historial completo en un modal con filtros por categoría | ✅ |
| HU 3.4 | Como usuario, quiero que la descripción de cada transacción se trunque con "..." si es muy larga | ✅ |
| HU 3.5 | Como usuario, quiero tocar un registro para ver su detalle completo (categoría, monto, tipo, cuenta, fecha, hora, descripción) | ✅ |

> **Nota:** La edición de transacciones fue descartada por diseño. La práctica en apps de finanzas personales es eliminar y crear nueva. Simplifica la UX.

### Épica 4: Datos y Configuración

| ID | Historia | Estado |
|----|---------|--------|
| HU 4.1 | Como usuario, quiero exportar mis datos como CSV y compartirlos por email, WhatsApp, Drive u otra app usando el diálogo nativo del sistema | ✅ |
| HU 4.2 | Como usuario, quiero que toda la app funcione sin internet | ✅ |

### Épica 5: Personalización

| ID | Historia | Estado |
|----|---------|--------|
| HU 5.1 | Como usuario, quiero elegir entre modo claro, oscuro o automático del sistema | ✅ |
| HU 5.2 | Como usuario, quiero configurar mis métodos de pago (Efectivo, Ahorros, Tarjeta, custom) | ✅ |
| HU 5.3 | Como usuario, quiero definir mi presupuesto mensual | ✅ |

### Épica 7: Notificaciones

| ID | Historia | Estado |
|----|---------|--------|
| HU 7.1 | Como usuario, quiero recibir una notificación en mi teléfono cuando supero el presupuesto de una categoría, incluso si la app está en segundo plano | ✅ |
| HU 7.2 | Como usuario, quiero recibir una notificación cuando completo una meta de ahorro | ✅ |
| HU 7.3 | Como usuario, quiero que la app me pida permiso de notificaciones antes de activarlas, no de forma intrusiva al abrir la app | ✅ |
| HU 7.4 | Como usuario, quiero ver un aviso dentro de la app cuando registro un gasto, elimino una transacción u ocurre cualquier acción relevante | ✅ |
| HU 7.5 | Como usuario, quiero poder deshacer la eliminación de una transacción desde el aviso que aparece en pantalla | ✅ |
| HU 7.6 | Como usuario, quiero que los avisos dentro de la app desaparezcan solos después de unos segundos si no los cierro | ✅ |
| HU 7.7 | Como usuario, quiero poder cerrar un aviso dentro de la app tocando × o arrastrándolo hacia arriba | ✅ |

### Épica 6: Funcionalidades Avanzadas

| ID | Historia | Estado |
|----|---------|--------|
| HU 6.1 | Como usuario, quiero definir metas de ahorro, abonarles y eliminarlas con swipe-to-delete en Ajustes | ✅ |
| HU 6.2 | Como usuario, quiero que el presupuesto sea siempre mensual para un control financiero claro y simple | ✅ |
| HU 6.3 | Como usuario, quiero ver un desglose de mis ingresos por categoría en la gráfica | ✅ |
| HU 6.4 | Como usuario, quiero que al tocar una columna de la gráfica se muestre el nombre de la categoría | ✅ |
| HU 6.5 | Como usuario, quiero que al registrar un ingreso el selector de categoría muestre solo categorías de ingreso | ✅ |
| HU 6.9 | Como usuario, quiero crear una categoría nueva directamente desde el selector de categoría al registrar una transacción, sin salir del formulario | ✅ |
| HU 6.10 | Como usuario, quiero elegir cualquier color al crear o editar una categoría usando un slider continuo de tono | ✅ |
| HU 6.6 | Como usuario nuevo, quiero un tour guiado que me muestre los pasos esenciales (configurar ingreso, registrar gasto por voz y manualmente) la primera vez que abro la app | ✅ |
| HU 6.7 | Como usuario, quiero ver un mensaje motivacional ("Nuevo mes, ¡comienza ahora!") cuando no hay transacciones en el período actual | ✅ |
| HU 6.8 | Como usuario, quiero que la etiqueta de presupuesto diga "Ingreso mensual" y muestre el monto configurado | ✅ |
| HU 6.9 | Como usuario, quiero que al abonar a una meta de ahorro se registre como gasto en mi Dashboard para que mi balance refleje el dinero comprometido | ✅ |

### Épica 8: Detección Automática de Transacciones *(v1.5.0)*

| ID | Historia | Estado |
|----|---------|--------|
| HU 8.1 | Como usuario, quiero que la app detecte automáticamente transacciones desde las notificaciones de mis apps bancarias (Bancolombia, Nequi, Davivienda y más) para no tener que registrarlas manualmente | ✅ |
| HU 8.2 | Como usuario, quiero revisar y editar cada transacción detectada antes de confirmar que se guarde, para evitar errores | ✅ |
| HU 8.3 | Como usuario, quiero ver un indicador de confianza (alto/medio/bajo) en cada transacción detectada, para saber cuáles necesitan más atención | ✅ |
| HU 8.4 | Como usuario, quiero eliminar individualmente una transacción detectada que no quiero guardar, deslizando la tarjeta hacia la izquierda | ✅ |
| HU 8.5 | Como usuario, quiero descartar todas las transacciones detectadas de una sola vez si no quiero guardar ninguna | ✅ |
| HU 8.6 | Como usuario, quiero que la app me avise visualmente (badge rojo) cuando hay transacciones bancarias detectadas esperando revisión | ✅ |
| HU 8.7 | Como usuario, quiero elegir qué bancos quiero que la app monitoree, para no recibir transacciones de cuentas que no me interesan | ✅ |
| HU 8.8 | Como usuario, quiero que la detección de notificaciones respete mi privacidad: solo el monto y el comercio, nunca saldos ni números de tarjeta | ✅ |

---

## 4. Categorías (Sistema Dinámico)

### 4.1 Resumen

Las categorías son **dinámicas y personalizables**. El usuario elige de un catálogo de presets y/o crea categorías custom en el onboarding. Se almacenan en `useSettingsStore.userCategories`.

### 4.2 Catálogo de Presets de Gasto (18)

Incluye las 8 originales + 10 adicionales: Comida, Transporte, Hogar, Compras, Salud, Entretenimiento, Educación, Personal, Ropa, Mascotas, Vehículo, Lujo, Viajes, Suscripciones, Deportes, Café, Regalos, Comer afuera.

### 4.3 Catálogo de Presets de Ingreso (6)

Salario, Freelance, Inversiones, Extra, Negocio, Otros ingresos.

### 4.4 Categorías Custom

El usuario puede crear categorías personalizadas con emoji, nombre, color continuo (slider de tono HSL) y keywords automáticos basados en el nombre. Los colores de acento y fondo se derivan automáticamente del tono elegido.

### 4.5 Puntos de creación de categorías

Las categorías se pueden crear desde **tres contextos**:

1. **Onboarding** — primera apertura de la app, tarjeta "+" con bordes punteados en la grilla
2. **Settings > Gestionar categorías** — misma pantalla de onboarding reutilizable
3. **Inline desde Nuevo Gasto/Ingreso** — ítem "Nueva" (ícono `+`) al final del `CategorySheet`; al guardar la nueva categoría queda autoseleccionada sin salir del formulario de transacción

### 4.6 Onboarding de Categorías

- Se muestra después del splash screen (primera vez)
- Grid de tarjetas redondeadas con emoji + nombre
- Tarjeta especial "Añadir categoría" con bordes punteados
- Modal centrado para crear categoría: selector horizontal de emoji, **slider continuo de tono** (`HueColorPicker`), campo de nombre con `KeyboardAvoidingView`
- No se puede saltar la selección (mínimo 1 categoría)
- Accesible desde Settings > "Mis categorías" > "Gestionar categorías" para editar después

---

## 5. Guía de Estilo Visual y UX/UI

### Filosofía
- **"Cero fricción"** — Cada pantalla tiene una acción principal clara
- **Dock flotante** como protagonista de la navegación inferior
- **FAB de micrófono** (azul `#135BEC`) como elemento más prominente

### Paleta de Colores

**Modo Claro:**
| Rol | Color | Hex |
|-----|-------|-----|
| Fondo | Gris perla | `#F2F2F4` |
| Superficie (tarjetas) | Blanco | `#FFFFFF` |
| Texto principal | Slate oscuro | `#0F172A` |
| Texto secundario | Gris medio | `#64748B` |
| Acento principal | Azul | `#135BEC` |
| Bordes | Gris claro | `#E2E8F0` |

**Modo Oscuro:**
| Rol | Color | Hex |
|-----|-------|-----|
| Fondo | Negro profundo | `#0D1117` |
| Superficie (tarjetas) | Gris oscuro | `#161B22` |
| Texto principal | Blanco suave | `#E6EDF3` |
| Texto secundario | Gris medio | `#8B949E` |
| Acento principal | Azul claro | `#4B82EF` |
| Bordes | Gris medio | `#30363D` |

**Colores funcionales:**
| Uso | Color | Contexto |
|-----|-------|----------|
| Ingreso / positivo | Verde `#16A34A` | Montos de ingreso, pill activo |
| Gasto / negativo | Rojo `#DC2626` | Montos de gasto, pill activo, alerta presupuesto |
| Ámbar (advertencia) | Naranja `#D97706` | Presupuesto entre 70-89% |
| Ghost track | Gris `#8B949E` | Categorías sin movimientos |

### Tipografía
- **Fuente:** Inter (sans-serif geométrica)
- **Montos grandes:** 36-64px, peso 800, `letterSpacing: -2`
- **Títulos:** 18-20px, peso 700
- **Cuerpo:** 14-16px, peso 400-500
- **Labels:** 11-12px, peso 600, uppercase

### Componentes de UI

| Componente | Principio |
|-----------|-----------|
| Transacciones | Sin bordes duros, fondo sutil redondeado, emoji + texto + monto |
| Iconos | `lucide-react-native`, trazo 2px, color adaptable al tema |
| Categorías | Emojis nativos del sistema en círculos suaves |
| Espacio negativo | Padding lateral 24px, gaps generosos entre secciones |
| Modales | Slide desde abajo, fondo semi-transparente oscuro |
| Diálogos de confirmación | `ConfirmDialog` custom con icono + variante + animación spring (reemplaza `Alert.alert` nativo) para acciones destructivas/sensibles |
| Notificaciones | Push del sistema (`expo-notifications`) para eventos clave (presupuesto, metas, transacciones detectadas). No se usan banners in-app |

### Micro-interacciones
| Interacción | Efecto |
|-------------|--------|
| Nueva transacción guardada | Vibración háptica `success` |
| Item aparece en lista | `FadeInDown` (Reanimated) |
| Transcripción de voz | Palabra por palabra con `FadeIn.duration(220)` |
| Barra de presupuesto | Animación con `withTiming` al cargar |
| Swipe-to-delete | `PanResponder` + `Animated` revela botón papelera |
| Long-press gráfica | Popup con 3 opciones tras ~400ms |
| Colapso de gráfica | Al hacer scroll, la gráfica colapsa suavemente (opacity + maxHeight) |
| Diálogo de confirmación | Spring scale + fade-in con variante visual (danger/warning/info) |
| Spotlight onboarding | GuidedTour: fade-in overlay oscuro con cutout circular + spring scale tooltip entre pasos |
| Reordenamiento de gráfica | `LayoutAnimation` suave al cambiar el orden de categorías por monto |
| Números animados | `AnimatedNumber` interpola Balance neto, Gastos e Ingresos al cambiar valores |
| Long-press detalle | Modal fade con tarjeta centrada, haptic feedback al activar (500ms) |
| Selección de categoría (onboarding) | Spring scale en modal de nueva categoría; checkmark animado en tarjetas |

---

## 6. Reglas de Negocio

### Transacciones
- `amount > 0` = Gasto
- `amount < 0` = Ingreso
- Balance neto = `SUM(amount)` (negativo = saldo positivo para el usuario)
- Se almacenan con fecha ISO local (sin UTC) para evitar desfase horario
- Tags opcionales en formato JSON: `["#trabajo", "#viaje"]`
- Se almacenan con `payment_method` (método de pago: cash, savings, credit u otro personalizado)

### Presupuesto
- Presupuesto mensual: valor numérico global, `0` = no configurado. Siempre mensual (sin división por períodos).
- Presupuesto por categoría: `emoji → monto`, activa alertas en gráfica
- Alertas: < 70% base, 70-89% ámbar, ≥ 90% rojo
- Sin presupuesto: barra al 50% fijo con color base (solo informativo)

### Metas de ahorro
- Al abonar a una meta, se crea automáticamente una transacción de gasto (amount positivo) con category_emoji = emoji de la meta, description = 'Abono a [nombre]', tags = ['#ahorro']. El savedAmount de la meta también se actualiza.
- Si se elimina la transacción, el savedAmount NO se sincroniza automáticamente.

### Moneda
- Pesos colombianos ($ COP), siempre con punto como separador de miles
- Sin decimales
- Formato custom con regex (nunca `toLocaleString`)

### NLP
- Detección automática: monto, categoría, tipo (gasto/ingreso), fecha
- Si no detecta categoría → mantiene la selección previa del usuario
- Si no detecta fecha → mantiene "hoy"
- Soporte completo de números en español: unidades, decenas, centenas, miles, millones
- Post-procesamiento: texto con cifras en palabras se convierte a dígitos formateados

### Datos
- SQLite local con WAL mode
- Sin conexión a internet requerida
- Sin datos bancarios sensibles almacenados
- Exportación en CSV como único mecanismo de backup

---

## 7. Requisitos No Funcionales

| Requisito | Especificación |
|-----------|---------------|
| Plataforma | Android 8+ (API 26+), iOS futuro |
| Rendimiento | Registro < 3s, scroll 60fps, queries < 100ms |
| Almacenamiento | SQLite local, ~1KB por transacción |
| Accesibilidad | Textos escalables, contraste suficiente en ambos temas |
| Offline | 100% funcional sin internet |
| Idioma | UI en español, código en inglés |
| Seguridad | Sin datos sensibles, sin transmisión de datos |
| Tamaño APK | < 30MB (build de producción) |

---

*Documento de requerimientos actualizado para MyWallet v1.4.0 — Marzo 2026*
