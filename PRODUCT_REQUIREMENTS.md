# MyWallet — Requerimientos de Producto

> **Versión:** 1.0.0 | **Plataforma:** Android (iOS futuro) | **Moneda:** COP | **Idioma UI:** Español

---

## 1. Visión y Filosofía del Producto

**MyWallet** es una aplicación personal de control financiero diseñada para eliminar la fricción del registro manual de gastos e ingresos.

- **Principio de diseño:** Minimalismo funcional — cero fricción, registro en menos de 3 segundos
- **Estética:** Interfaz limpia inspirada en Google Stitch Design System y MonAI
- **Dato fundamental:** local-first — 100% funcional sin internet con datos locales en SQLite, sin servidor propio ni suscripciones. Con cuenta (Google, opcional) y conexión, respaldo en la nube y listas compartidas vía Firebase (Fases 1–4 implementadas; la Fase 5, publicación, sigue en curso: ver `SYNC_ROADMAP.md`)
- **Público objetivo:** Usuarios en Colombia que quieren controlar su dinero de forma rápida, simple y visual

---

## 2. Arquitectura de Información

La estructura es plana y directa. No hay menús de hamburguesa ni navegaciones complejas.

### 2.1 Dashboard (Pantalla Principal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Balance Neto | Tipografía grande: `Ingresos - Gastos` **del período visto** — durante una búsqueda, el neto de los resultados encontrados | ✅ Implementado |
| Saldo total | Línea bajo el balance: `Ingresos - Gastos` de todo el historial (oculta en la vista "Todo el tiempo" y durante una búsqueda) | ✅ Implementado |
| Pills Gastos/Ingresos | Filtran toda la vista por tipo (rojo suave / verde suave) | ✅ Implementado |
| Barra de pago | En vistas de período de pago con pago configurado: "X% de $pago · recibido $Y" (gasto del período vs pago esperado, más lo recibido). Aviso "$X sobre tu pago" si el gasto supera el pago | ✅ Implementado |
| Estado "período vacío" | Si no hay transacciones en el período en curso: barras fantasma (opacity 0.18) + "Nuevo mes/Nueva semana/Nuevo período/Nuevo año, ¡comienza ahora!". Período pasado sin datos: "Sin registros en este período" | ✅ Implementado |
| Botón de calendario (períodos) | Toque = mostrar/ocultar la tira deslizable de períodos (ciclos de pago o años, cada uno con su neto); toque largo = menú (ciclo / Año / Todo el tiempo / Rango personalizado… / Restablecer predeterminado / Pago y período). Vista no predeterminada: punto rojo + "x" para restablecer | ✅ Implementado |
| Rango personalizado | Calendario de rango (`DateRangeSheet` modo días): cualquier rango, incluso un solo día | ✅ Implementado |
| Gráfica de Categorías | Barras verticales con scroll horizontal, ghost tracks, alertas por color | ✅ Implementado |
| Lista de Transacciones | `FlatList` con items tipo tarjeta (fondo blanco + sombra en modo claro), swipe izquierda elimina (con confirmación), swipe derecha edita | ✅ Implementado |
| Patrimonio neto | Junto al saldo total (`allTimeNetBalance - totalDebt`), solo visible si hay deudas activas registradas en Ajustes → Deudas | ✅ Implementado |
| Dock Flotante | FAB micrófono, botón +, lupa, gráfica (→ `/reports`) — reemplaza tab bar | ✅ Implementado |
| Detalle de transacción | Hoja (`BottomSheet`) al hacer **tap** en un item: emoji, monto, categoría, tipo, cuenta, fecha, hora (12h), descripción, tags | ✅ Implementado |
| Selector de lista ("Personal ▾") | Botón a la izquierda del header: elegir lista, Compartir (resumen en texto del período visto), Editar la activa, Nueva. Ícono de personas en las listas compartidas | ✅ Implementado |
| Chip de cuentas | Bajo los pills, en una lista con más personas: "Ana te debe $X ›" / "Están a mano" / "N cuentas pendientes"; abre el detalle (`SettlementSheet`) | ✅ Implementado |
| Deslizar el balance para traer cambios | Con sesión iniciada, sin búsqueda ni filtro de categoría: deslizar hacia abajo sobre el balance trae lo último de la nube. Anillo de progreso, vibración al poder soltar, ✓ al terminar o nube tachada sin respuesta (la sync sigue en segundo plano) | ✅ Implementado |
| Lista agrupada por día | Cada grupo con su etiqueta ("Hoy"/"Ayer"/fecha) y el neto del día | ✅ Implementado |
| Animación scroll de gráfica | Las barras se comprimen progresivamente al hacer scroll (Reanimated `interpolate`). Las etiquetas hacen crossfade de vertical a horizontal compacto. Gráfica y lista en scroll unificado (`FlatList` + `ListHeaderComponent`) | ✅ Implementado |
| Odómetro de valores | `RollingNumber`: efecto ruleta, cada dígito gira siempre hacia adelante, escalonado de izquierda a derecha (respeta "reducir movimiento"). Separadores de miles COP con fade-in/out. Usado en Balance neto + Pills de gastos/ingresos | ✅ Implementado |

### 2.2 Nuevo Gasto / Nuevo Ingreso (Modal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Título dinámico | "Nuevo Gasto" o "Nuevo Ingreso" según origen | ✅ Implementado |
| Monto grande | Tamaño adaptable según dígitos (36-64px) con `adjustsFontSizeToFit` | ✅ Implementado |
| Campo de texto NLP | Detecta monto, categoría, fecha en tiempo real | ✅ Implementado |
| Selectores rápidos | Fecha (Hoy/Calendario), Categoría (grid dinámico + ítem "Nueva" para crear inline), Cuenta (método de pago guardado en transacción) | ✅ Implementado |
| Tags | Sugeridos (#viaje, #trabajo, etc.) + custom | ✅ Implementado |
| Lista y Pagó | "LISTA" (con 2+ listas) elige o cambia la lista del movimiento; "PAGÓ" (si la lista tiene personas) elige quién pagó, con "Tú" primero | ✅ Implementado |
| Guardar | Botón ✓ + vibración háptica + regresa al Dashboard | ✅ Implementado |
| Auto-formato | Mientras se edita el monto se muestran dígitos crudos sin puntos de miles (evita que el cursor salte al final en Android); los puntos de miles se agregan automáticamente al salir del campo | ✅ Implementado |

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
| Pago y período | Frecuencia del pago (semanal, cada 2 semanas, varias veces al mes, mensual con día de inicio, todo el tiempo) y pago esperado por período (uno por día de pago en "varias veces al mes"). Define los períodos del Dashboard y la barra de pago. Reemplaza "Ingreso mensual" (el valor anterior se migra como pago mensual) | ✅ Implementado |
| Cuenta | Iniciar sesión con Google (opcional); con sesión: correo, estado del respaldo (tocar = respaldar ya), "Cerrar sesión" (Mantener / Borrar de este teléfono) y "Eliminar cuenta" | ✅ Implementado |
| Tus listas | Hoja con todas las listas (tocar = activar, lápiz = editar la activa), "Nueva lista" y "Unirme con un código" | ✅ Implementado |
| Métodos de pago | Agregar/editar/eliminar (hoja), con ícono sugerido por nombre | ✅ Implementado |
| Presupuesto por categoría | Límite por cada categoría de gasto de la lista activa (hoja "Presupuestos") | ✅ Implementado |
| Metas de ahorro | Crear/editar/abonar/eliminar metas (hoja); editar/eliminar con íconos explícitos ✏️/🗑️, ya no swipe-to-delete. Al abonar se crea transacción de gasto automáticamente (con emoji de la meta, tag #ahorro) | ✅ Implementado |
| Deudas *(nuevo)* | Crear/editar/pagar/eliminar deudas (hoja): nombre, emoji, monto total, cuota mensual, día de pago recurrente. Al pagar se crea transacción de gasto automáticamente (tag #deuda) y se reduce el saldo pendiente. Recordatorio push mensual en el día de pago; notificación al liquidar la deuda | ✅ Implementado |
| Modo oscuro | Sistema / Claro / Oscuro (dark mode completo) — fila dentro de la sección "Sistema" | ✅ Implementado |
| Bloqueo con huella | Pide huella/rostro/PIN del sistema al abrir la app y al volver de background; activar y desactivar requieren autenticarse. Sin biometría ni PIN configurados no se puede activar | ✅ Implementado |
| Exportar/Importar CSV *(por lista)* | Exportar escribe un `.csv` real (`expo-file-system`) con id/fecha/tipo/descripción/categoría/monto/método de pago/tags/quién pagó, y lo comparte con la hoja del sistema (`expo-sharing`). Importar (`expo-document-picker`) agrega los movimientos de un `.csv` a la lista activa sin duplicar los que ya están. Reemplaza al antiguo "Exportar datos" (texto plano vía `Share`) | ✅ Implementado |
| Limpiar datos | Desde Personal elimina las transacciones de todas las listas; desde otra lista, solo las suyas (con confirmación vía diálogo custom animado) | ✅ Implementado |
| Diseño Material (2026-08-17) | Header con flecha llana + título inline (reemplaza el header estilo iOS con botón circular flotante), íconos de fila circulares | ✅ Implementado |
| Sección "Sistema" fusionada (2026-09-02) | Las secciones antes independientes Apariencia (Modo oscuro), Sistema (Exportar/Borrar) y Acerca de (Versión) se unieron en una sola sección "Sistema" (hoy: Modo oscuro, Bloqueo con huella, Borrar historial, Versión) | ✅ Implementado |
| Tarjetas sin borde (2026-09-02) | `Card` perdió el `borderWidth` que había ganado en el rediseño Material — se distingue del fondo solo por color de relleno | ✅ Implementado |
| Popups como hojas (2026-09-29) | Todo lo que era un popup centrado (confirmaciones, avisos de permiso, formularios de categoría/presupuesto/métodos/metas/deudas) es una hoja que sube desde abajo, con tap fuera y deslizar hacia abajo para cerrar | ✅ Implementado |
| Secciones reordenadas (listas) | Orden actual: Cuenta → Listas (Tus listas) → En tu lista (Categorías, Presupuestos, Pago y período, Mostrar ingresos, Compartir lista, Exportar/Importar CSV) → Gestión (Métodos de pago, Metas, Deudas) → Detección automática → Sistema | ✅ Implementado |

### 2.7 Sistema de Notificaciones (dos capas)

#### Capa 1 — Notificaciones OS locales (`expo-notifications`)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Servicio | `src/services/notificationService.ts` — `requestNotificationPermissions`, `checkAndNotifyBudget`, `checkAndNotifyGoalCompleted`, `scheduleDebtReminder`/`cancelDebtReminder`/`notifyDebtPaidOff` *(deudas, nuevo)* | ✅ Implementado |
| Permiso | Se solicita la primera vez que el usuario configura un presupuesto por categoría (vía `ConfirmDialog` previo) | ✅ Implementado |
| Anti-duplicación presupuesto | `budgetNotifiedMonth: Record<string, string>` en `useSettingsStore` — hasta dos notificaciones por categoría (umbral y 100%) por ciclo de presupuesto (mes calendario, o desde el día de inicio si la frecuencia es mensual con desfase) | ✅ Implementado |
| Anti-duplicación transacción detectada | Una sola push por transacción aunque Android entregue la notificación del banco dos veces (`addPendingItem` → `isNew`, e `identifier` único por ítem) | ✅ Implementado |
| Anti-duplicación metas | `goalNotifiedIds: string[]` en `useSettingsStore` — una sola notificación por meta | ✅ Implementado |
| Limpieza automática | `clearExpiredBudgetNotifications()` se ejecuta en el bootstrap de la app (`app/_layout.tsx`) para limpiar flags de ciclos anteriores | ✅ Implementado |
| Recordatorio de deudas *(nuevo)* | `scheduleDebtReminder()` usa un trigger `MONTHLY` nativo de `expo-notifications` (primer trigger programado por fecha del proyecto, todo lo demás es disparo inmediato) — dispara en el `dueDay` de la deuda a las 9am; se cancela solo al liquidar la deuda | ✅ Implementado |

#### Capa 2 — Banners in-app

**Eliminado.** El sistema de toasts in-app (`useToastStore`, `ToastBanner`, `ToastContainer`) fue retirado. Los eventos relevantes se notifican exclusivamente vía push notifications del sistema (Capa 1). Errores críticos usan `Alert.alert` nativo y confirmaciones destructivas usan `ConfirmDialog`.

### 2.8 Guided Tour / Onboarding (primera vez)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Componente | `GuidedTour.tsx` — overlay reutilizable con spotlight paso a paso, cutout circular y tooltip animado | ✅ Implementado |
| Registro de refs | `tourRefs.ts` — registro global de refs (`getTourRef`, `TOUR_KEYS`) para localizar targets | ✅ Implementado |
| Pantallas de bienvenida | 5 pasos: cuenta de Google ("Continuar con Google" / "Ahora no"; si la cuenta ya tenía el onboarding hecho, restaura y entra al Dashboard) → categorías → "¿Cuándo y cuánto te pagan?" (`pay-onboarding`, omitible) → detección automática → bancos | ✅ Implementado |
| Paso 1 (Dashboard) | Spotlight en el botón de calendario → "¡Bienvenido a MyWallet!": tocarlo muestra los períodos, mantenerlo abre año/rango/pago | ✅ Implementado |
| Paso 2 (Dashboard) | Spotlight en FAB micrófono → "Registro por voz" | ✅ Implementado |
| Paso 3 (Dashboard) | Spotlight en botón + → "Registro manual" | ✅ Implementado |
| Tour en Ajustes | Eliminado: el pago se configura en las pantallas de bienvenida, ya no con un desvío del tour a "Ingreso mensual" | — |
| Persistencia | `hasCompletedOnboarding` + `onboardingStep` en AsyncStorage. Se puede saltar en cualquier paso con "Omitir" | ✅ Implementado |

### 2.5 Períodos del Dashboard

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Frecuencia predeterminada | Semanal, cada 2 semanas, varias veces al mes (días 1–28), mensual con día de inicio (1–28) o todo el tiempo; se elige en "Pago y período" (Ajustes, menú del calendario u onboarding) | ✅ Implementado |
| Tira de períodos | Fila deslizable de ciclos (o años) desde el primer movimiento hasta el actual + 1 futuro, cada uno con su neto; el ítem centrado es el seleccionado, con tick háptico al cruzar | ✅ Implementado |
| Menú del calendario | Toque largo: ciclo / Año / Todo el tiempo / Rango personalizado… / Restablecer predeterminado / Pago y período | ✅ Implementado |
| Vista no predeterminada | Punto rojo en el botón + "x" para restablecer; chip con el nombre del período cuando la tira está oculta | ✅ Implementado |
| Efecto en Dashboard | Gráfica + lista + balance + pills reflejan el período elegido; el saldo total siempre cubre todo el historial | ✅ Implementado |
| Presupuesto por categoría | Se mide por mes calendario, o desde el día de inicio si la frecuencia es mensual con desfase | ✅ Implementado |
| *Selector de mes/año (`MonthPickerModal`) y chip "Este mes" (`FilterChips`)* | *Reemplazados por la tira y el menú del calendario* | Eliminado |

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
| HU 2.1 | Como usuario, quiero ver el balance neto (ingresos - gastos) del período que estoy mirando con tipografía grande y clara, y debajo mi saldo total de todo el historial para no perder de vista cuánta plata tengo | ✅ *(modificada en 61957c1: antes el número grande era el saldo de todo el historial)* |
| HU 2.2 | Como usuario, quiero una barra que compare lo que llevo gastado en el período con lo que espero que me paguen en ese período, y ver cuánto me ha entrado de verdad | ✅ *(modificada: antes comparaba contra un presupuesto mensual fijo)* |
| HU 2.3 | Como usuario, quiero moverme entre mis períodos (ciclos de pago o años) deslizando una tira, o ver todo el tiempo o un rango de fechas a mi elección | ✅ *(modificada: reemplaza el chip de período rápido + selector de mes/año)* |
| HU 2.4 | Como usuario, quiero una gráfica de barras que muestre cuánto gasté en cada categoría con alertas visuales | ✅ |
| HU 2.5 | Como usuario, quiero filtrar la vista completa (gráfica + lista) tocando los pills de Gastos o Ingresos | ✅ |
| HU 2.6 | Como usuario, quiero configurar presupuestos por categoría y ver alertas cuando me acerque al límite | ✅ |
| HU 2.7 | Como usuario, quiero dejar presionada una columna de la gráfica para editar su presupuesto (o agregarlo si no existe) o crear una transacción en esa categoría | ✅ |
| HU 2.8 | Como usuario, quiero seleccionar un mes y año específico para ver los movimientos y la gráfica de ese período | ✅ Vía la tira de períodos o "Rango personalizado…" |
| HU 2.9 | Como usuario, quiero que el Dashboard corte el tiempo según cuándo me pagan (semanal, cada 2 semanas, varias veces al mes, mensual con día de inicio o sin cortes) | ✅ |
| HU 2.10 | Como usuario, quiero ver de un vistazo cuánto neto tuve en cada período, para compararlos sin abrirlos uno por uno | ✅ |
| HU 2.11 | Como usuario, quiero volver al período actual con un solo toque cuando estoy mirando otro | ✅ |

### Épica 3: Gestión de Transacciones

| ID | Historia | Estado |
|----|---------|--------|
| HU 3.1 | Como usuario, quiero eliminar una transacción deslizando hacia la izquierda en la lista (con diálogo de confirmación) | ✅ |
| HU 3.2 | Como usuario, quiero buscar transacciones por descripción, categoría o tag | ✅ |
| HU 3.3 | Como usuario, quiero ver el historial completo en un modal con filtros por categoría | ✅ |
| HU 3.4 | Como usuario, quiero que la descripción de cada transacción se trunque con "..." si es muy larga | ✅ |
| HU 3.5 | Como usuario, quiero tocar un registro para ver su detalle completo (categoría, monto, tipo, cuenta, fecha, hora, descripción) | ✅ |
| HU 3.6 | Como usuario, quiero editar una transacción ya guardada (monto, descripción, categoría, cuenta, fecha) deslizándola hacia la derecha, sin tener que eliminarla y crear una nueva | ✅ |

> **Nota histórica:** la edición de transacciones se descartó por diseño en una versión anterior ("solo crear y eliminar", más simple). Se revirtió el 2026-08-14 a pedido explícito del usuario — HU 3.6 la implementa con `updateTransaction()` real en la base de datos.

### Épica 4: Datos y Configuración

| ID | Historia | Estado |
|----|---------|--------|
| HU 4.1 | Como usuario, quiero exportar los movimientos de una lista como CSV y compartirlos por email, WhatsApp, Drive u otra app usando el diálogo nativo del sistema | ✅ |
| HU 4.2 | Como usuario, quiero que toda la app funcione sin internet | ✅ |
| HU 4.3 | Como usuario, quiero proteger la app con mi huella, rostro o PIN del teléfono, para que nadie con mi teléfono desbloqueado vea mis finanzas | ✅ |
| HU 4.4 | Como usuario, quiero importar un CSV a una lista para recuperar o traspasar movimientos, sin que se dupliquen los que ya tengo | ✅ |
| HU 4.5 | Como usuario, quiero separar mis movimientos en listas (un viaje, un negocio…) con su propio período, categorías y presupuesto, y ver en Personal también lo que pagué en esas listas | ✅ |
| HU 4.6 | Como usuario, quiero registrar quién pagó cada gasto en una lista con más personas y ver quién le debe a quién, para repartir gastos compartidos sin depender de otra app | ✅ |

### Épica 5: Personalización

| ID | Historia | Estado |
|----|---------|--------|
| HU 5.1 | Como usuario, quiero elegir entre modo claro, oscuro o automático del sistema | ✅ |
| HU 5.2 | Como usuario, quiero configurar mis métodos de pago (Efectivo, Ahorros, Tarjeta, custom) | ✅ |
| HU 5.3 | Como usuario, quiero definir cada cuánto y cuánto me pagan (antes: "mi presupuesto mensual") | ✅ *(modificada: "Ingreso mensual" pasó a "Pago y período")* |
| HU 5.4 | Como usuario nuevo, quiero indicar cuándo y cuánto me pagan durante la bienvenida, o saltarlo y hacerlo después | ✅ |

### Épica 7: Notificaciones

| ID | Historia | Estado |
|----|---------|--------|
| HU 7.1 | Como usuario, quiero recibir una notificación en mi teléfono cuando alcanzo el umbral configurado del presupuesto de una categoría (default 80%), incluso si la app está en segundo plano | ✅ |
| HU 7.2 | Como usuario, quiero recibir una notificación cuando completo una meta de ahorro | ✅ |
| HU 7.3 | Como usuario, quiero que la app me pida permiso de notificaciones antes de activarlas, no de forma intrusiva al abrir la app | ✅ |
| HU 7.4 | Como usuario, quiero recibir una notificación push cuando se detecta una transacción bancaria nueva, y al tocarla la app me lleve a revisarla | ✅ Si es la única pendiente, va directo al formulario prellenado (`active-expense`, 2026-09-02); si hay 2+ pendientes, va a la lista de revisión completa |
| HU 7.5 | Como usuario, quiero poder activar/desactivar las alertas de presupuesto y configurar el umbral de alerta (porcentaje) en Ajustes | ✅ |
| HU 7.6 | Como usuario, quiero recibir una segunda notificación si supero el 100% del presupuesto (después de la del umbral) para tomar acción inmediata | ✅ |
| HU 7.7 | Como usuario, no quiero que la app me sature con avisos efímeros dentro de la pantalla — los eventos relevantes vienen como notificaciones del sistema; los errores críticos usan un diálogo nativo (`Alert.alert`) | ✅ |

### Épica 6: Funcionalidades Avanzadas

| ID | Historia | Estado |
|----|---------|--------|
| HU 6.1 | Como usuario, quiero definir metas de ahorro, abonarles, editarlas y eliminarlas desde Ajustes (botones ✏️/🗑️) | ✅ |
| HU 6.2 | Como usuario, quiero que el presupuesto por categoría sea mensual, y que si mi mes empieza el día que me pagan, se mida desde ese día | ✅ *(modificada: el ciclo sigue el día de inicio de la frecuencia mensual)* |
| HU 6.3 | Como usuario, quiero ver un desglose de mis ingresos por categoría en la gráfica | ✅ |
| HU 6.4 | Como usuario, quiero filtrar la lista por una categoría específica tocando su columna en la gráfica, y limpiar el filtro con el botón atrás del dispositivo o deslizando hacia abajo | ✅ |
| HU 6.5 | Como usuario, quiero que al registrar un ingreso el selector de categoría muestre solo categorías de ingreso | ✅ |
| HU 6.9 | Como usuario, quiero crear una categoría nueva directamente desde el selector de categoría al registrar una transacción, sin salir del formulario | ✅ |
| HU 6.10 | Como usuario, quiero elegir cualquier color al crear o editar una categoría usando un slider continuo de tono | ✅ |
| HU 6.6 | Como usuario nuevo, quiero un tour guiado que me muestre los pasos esenciales (mis períodos en el calendario, registrar por voz y manualmente) la primera vez que abro la app | ✅ |
| HU 6.7 | Como usuario, quiero ver un mensaje motivacional ("Nuevo mes, ¡comienza ahora!") cuando no hay transacciones en el período actual | ✅ |
| HU 6.8 | Como usuario, quiero que la etiqueta de presupuesto diga "Ingreso mensual" y muestre el monto configurado | Reemplazada por HU 5.3 ("Pago y período") |
| HU 6.9 | Como usuario, quiero que al abonar a una meta de ahorro se registre como gasto en mi Dashboard para que mi balance refleje el dinero comprometido | ✅ |

### Épica 8: Detección Automática de Transacciones

| ID | Historia | Estado |
|----|---------|--------|
| HU 8.1 | Como usuario, quiero que la app detecte automáticamente transacciones desde las notificaciones de mis apps bancarias (Bancolombia, Nequi, Davivienda y más) para no tener que registrarlas manualmente | ✅ |
| HU 8.2 | Como usuario, quiero revisar y editar cada transacción detectada antes de confirmar que se guarde, para evitar errores | ✅ |
| HU 8.3 | Como usuario, quiero ver un indicador de confianza (alto/medio/bajo) en cada transacción detectada, para saber cuáles necesitan más atención | ✅ |
| HU 8.4 | Como usuario, quiero eliminar individualmente una transacción detectada que no quiero guardar, tocando el ícono de papelera en su tarjeta | ✅ |
| HU 8.5 | Como usuario, quiero descartar todas las transacciones detectadas de una sola vez si no quiero guardar ninguna | ✅ Botón 🗑️ en el header de "Revisar registros", con confirmación explícita (`ConfirmDialog`) antes de vaciar la cola |
| HU 8.6 | Como usuario, quiero que la app me avise visualmente (badge rojo) cuando hay transacciones bancarias detectadas esperando revisión | ✅ |
| HU 8.7 | Como usuario, quiero elegir qué bancos quiero que la app monitoree, para no recibir transacciones de cuentas que no me interesan | ✅ |
| HU 8.8 | Como usuario, quiero que la detección de notificaciones respete mi privacidad: solo el monto y el comercio, nunca saldos ni números de tarjeta | ✅ |
| HU 8.9 | Como usuario, quiero que la app NO detecte como transacción real un recordatorio de pago pendiente de factura ("Tienes un pago por $X. Completa tu pago...") que todavía no he confirmado | ✅ |
| HU 8.10 | Como usuario, quiero que la app me explique cómo evitar que el sistema operativo detenga la detección en background (optimización de batería del fabricante), con acceso directo a esos ajustes | ⚠️ Revertida en parte (2026-09-02): se quitó de la UI la fila "Optimización de batería" (`Linking.openSettings()`) a pedido del usuario — la limitación de fondo sigue existiendo, documentada en `DOCUMENTATION.md`/`AGENTS.md`, pero ya no hay atajo dentro de la app |
| HU 8.11 *(nuevo, 2026-09-02)* | Como usuario, quiero que al tocar una notificación de transacción detectada, si es la única pendiente, la app me lleve directo al formulario ya prellenado en vez de pasar por la lista de revisión, para ahorrarme un paso | ✅ |
| HU 8.12 | Como usuario, quiero recibir una sola notificación por cada transacción detectada, aunque mi banco la envíe dos veces | ✅ |
| HU 8.13 | Como usuario, quiero que la descripción de una transacción detectada muestre el comercio real (ej. "Compra en APPLE.COM/BILL") y nunca los dígitos de mi tarjeta | ✅ |

### Épica 9: Chat NLP (Experimental)

> ⚠️ **Nota de alcance:** `app/(tabs)/chat.tsx` es una pantalla completa y funcional (sesiones persistidas en SQLite, historial, consultas en lenguaje natural), pero **no hay ningún punto de entrada en la UI** que navegue a ella (no está en `FloatingDock`, ni en el Dashboard) — solo es alcanzable navegando directamente a la ruta `/chat`. Esto ya estaba así antes de este rango de commits (ver `CONTEXT.md`, sección 18, "Código inactivo"); las historias de esta épica describen lo que la pantalla hace una vez se llega a ella, no implican que sea descubrible desde el flujo normal de la app.

| ID | Historia | Estado |
|----|---------|--------|
| HU 9.1 | Como usuario, quiero hacerle preguntas en lenguaje natural a un asistente local sobre mis finanzas (ej. resumen semanal) y recibir una respuesta con los datos de mi propia base de datos, sin conexión a internet | ✅ |
| HU 9.2 | Como usuario, quiero que cada conversación se guarde como una sesión con título automático (derivado de mi primer mensaje), para poder retomarla después | ✅ |
| HU 9.3 | Como usuario, quiero ver mi historial de conversaciones agrupado por HOY / AYER / ANTES en un panel lateral | ✅ |
| HU 9.4 | Como usuario, quiero renombrar una conversación manteniendo presionado su nombre en el historial | ✅ |
| HU 9.5 | Como usuario, quiero que borrar una conversación pida confirmación explícita, porque perder todo el historial de esa conversación es irreversible | ✅ *(agregado en este rango — antes se borraba sin confirmar)* |
| HU 9.6 | Como usuario, quiero iniciar una conversación nueva sin perder las anteriores | ✅ |

### Épica 10: Promedios / Reportes *(nuevo)*

| ID | Historia | Estado |
|----|---------|--------|
| HU 10.1 | Como usuario, quiero ver el promedio mensual histórico de gasto por categoría, para saber en qué gasto más en promedio a lo largo del tiempo (no solo en el período que tenga filtrado en el Dashboard) | ✅ |
| HU 10.2 | Como usuario, quiero el mismo promedio mensual histórico pero para mis ingresos por categoría | ✅ |
| HU 10.3 | Como usuario, quiero ver un ranking completo de mis categorías ordenado de mayor a menor promedio mensual | ✅ |
| HU 10.4 | Como usuario, quiero ver la tendencia de mis gastos/ingresos totales mes a mes en un gráfico de barras, eligiendo el rango de fechas que quiero analizar | ✅ |
| HU 10.5 | Como usuario, quiero acceder a esta pantalla de promedios desde el dock flotante, sin tener que buscarla dentro de Ajustes | ✅ |

### Épica 11: Cuenta, respaldo y listas compartidas *(Sync Fases 1–5, ver `SYNC_ROADMAP.md`)*

| ID | Historia | Estado |
|----|---------|--------|
| HU 11.1 | Como usuario, quiero iniciar sesión con Google de forma opcional (en la bienvenida o después en Ajustes → Cuenta), y que sin cuenta la app siga funcionando completa | ✅ |
| HU 11.2 | Como usuario con sesión, quiero que toda mi información (movimientos, listas, categorías, presupuestos, métodos de pago, metas, deudas y ajustes) se respalde sola en segundo plano, sin tener que esperarla nunca para usar la app | ✅ |
| HU 11.3 | Como usuario, quiero instalar la app en un teléfono nuevo, iniciar sesión y recuperar todo, sin repetir la bienvenida si ya la había hecho | ✅ |
| HU 11.4 | Como usuario, quiero ver en Ajustes → Cuenta si mi información está respaldada o cuántos cambios faltan por subir, y poder respaldar en el momento | ✅ |
| HU 11.5 | Como usuario, al cerrar sesión quiero elegir si mantengo mi información en el teléfono o la borro, sin poder borrar algo que todavía no se respaldó | ✅ |
| HU 11.6 | Como usuario, si inicio sesión con otra cuenta en un teléfono que tiene datos de una anterior, quiero que la app me pregunte si unirlos o reemplazarlos antes de subir nada | ✅ |
| HU 11.7 | Como usuario, quiero eliminar mi cuenta y todo lo que tengo en la nube desde la app (o pedirlo en una página web si ya no tengo la app), sin que se borre lo que tengo en el teléfono | ✅ En la app: Ajustes → Cuenta → Eliminar cuenta. Web: landing `/[lang]/delete-account` |
| HU 11.8 | Como usuario, quiero compartir una lista con otras personas mediante un código de invitación, para que cada una registre desde su propio teléfono y con su cuenta | ✅ Código de 6 caracteres, vence en 7 días |
| HU 11.9 | Como usuario invitado, quiero unirme a una lista con un código y, si ya estaba en ella con mi nombre, quedar ligado a ese nombre y a lo que ya había pagado | ✅ "¿Quién eres?" → "Soy Ana" / "Soy otra persona" |
| HU 11.10 | Como usuario de una lista compartida, quiero que el período y los presupuestos sean míos, y que el nombre, el ícono, las categorías y las personas sean de todos | ✅ |
| HU 11.11 | Como usuario, quiero traer en el momento lo que registraron los demás deslizando hacia abajo sobre el balance del Dashboard | ✅ |
| HU 11.12 | Como miembro de una lista compartida, quiero poder salir de ella y quedarme con lo que ya tenía como una lista propia; como dueño, quiero poder quitar a alguien o eliminar la lista para todos | ✅ |
| HU 11.13 | Como usuario, quiero que un movimiento que borro no quede guardado en la nube con su monto y descripción, solo la marca de que se borró | ✅ |

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
3. **Inline desde Nuevo Gasto/Ingreso** — ítem "Nueva" (ícono `+`) al final de la lista horizontal de categorías (ya no hay un `CategorySheet` intermedio, eliminado en el rediseño 2026-08-12); al guardar la nueva categoría queda autoseleccionada sin salir del formulario de transacción

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
| Diálogos de confirmación | `ConfirmDialog` custom con icono + variante, presentado como hoja inferior (reemplaza `Alert.alert` nativo) para acciones destructivas/sensibles. Ningún popup va centrado en pantalla |
| Notificaciones | Push del sistema (`expo-notifications`) para eventos clave (presupuesto, metas, transacciones detectadas). No se usan banners in-app |

### Micro-interacciones
| Interacción | Efecto |
|-------------|--------|
| Nueva transacción guardada | Vibración háptica `success` |
| Item aparece en lista | `FadeInDown` (Reanimated) |
| Transcripción de voz | Palabra por palabra con `FadeIn.duration(220)` |
| Tira de períodos | Ítems se atenúan/encogen según la distancia al centro siguiendo el dedo; tick háptico al cruzar de período |
| Swipe-to-delete | `PanResponder` + `Animated` revela botón papelera |
| Long-press gráfica | Popup con 3 opciones tras ~400ms |
| Colapso de gráfica | Al hacer scroll, la gráfica colapsa suavemente (opacity + maxHeight) |
| Diálogo de confirmación | Hoja que sube desde abajo (`BottomSheet`) con variante visual (danger/warning/info) |
| Spotlight onboarding | GuidedTour: fade-in overlay oscuro con cutout circular + spring scale tooltip entre pasos |
| Reordenamiento de gráfica | `LayoutAnimation` suave al cambiar el orden de categorías por monto |
| Números animados | `RollingNumber` anima por dígito Balance neto, Gastos e Ingresos al cambiar valores |
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
- Pago esperado: `defaultPeriod.pay`, por período de la frecuencia elegida (en "varias veces al mes", uno por día de pago). Sin valor = no configurado (no hay barra de pago).
- Presupuesto por categoría (cada lista tiene los suyos; en una lista compartida, cada persona los suyos): `emoji → monto` por mes (calendario, o desde el día de inicio si la frecuencia es mensual con desfase), activa alertas en gráfica
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
- SQLite local con WAL mode, siempre la fuente de verdad
- Sin conexión a internet requerida
- Sin datos bancarios sensibles almacenados, ni en el teléfono ni en la nube; el texto crudo de las notificaciones bancarias no se sube
- Backup: con sesión iniciada, respaldo automático en Firebase (Firestore, `users/{uid}`; listas compartidas en `spaces/{id}`). Sin sesión, exportar CSV por lista
- Borrar es lógico (`deleted_at`) para que la sync propague el borrado; en la nube un movimiento borrado es solo `{ updatedAt, deletedAt }`, sin contenido

---

## 7. Requisitos No Funcionales

| Requisito | Especificación |
|-----------|---------------|
| Plataforma | Android 8+ (API 26+), iOS futuro |
| Rendimiento | Registro < 3s, scroll 60fps, queries < 100ms |
| Almacenamiento | SQLite local, ~1KB por transacción |
| Accesibilidad | Textos escalables, contraste suficiente en ambos temas |
| Offline | 100% funcional sin internet; la sync con la nube nunca bloquea la app |
| Idioma | UI en español, código en inglés |
| Seguridad | Sin datos sensibles; sin sesión no se transmite nada. Con sesión, la única red es Firebase (Auth + Firestore), con reglas que limitan cada respaldo a su dueño y cada lista compartida a sus miembros (`firestore.rules`); bloqueo opcional con huella/rostro/PIN del sistema |
| Tamaño APK | < 30MB (build de producción) |

---

*Documento de requerimientos actualizado para MyWallet v1.0.0 — Octubre 2026*
