# MyWallet — Requerimientos de Producto

> **Versión:** 1.0.0 | **Plataforma:** Android (iOS futuro) | **Moneda:** COP | **Idioma UI:** Español

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
| Barra de Presupuesto | Progreso del gasto vs presupuesto mensual configurado | ✅ Implementado |
| Filtros (Chips) | Período (Hoy, Semana, Mes, Año, Todo) + Categoría | ✅ Implementado |
| Gráfica de Categorías | Barras verticales con scroll horizontal, ghost tracks, alertas por color | ✅ Implementado |
| Lista de Transacciones | Items con swipe-to-delete, emoji, descripción truncada, monto | ✅ Implementado |
| Dock Flotante | FAB micrófono, botón +, lupa, chat — reemplaza tab bar | ✅ Implementado |
| Botón "Ver más" | Abre modal de historial completo | ✅ Implementado |

### 2.2 Nuevo Gasto / Nuevo Ingreso (Modal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Título dinámico | "Nuevo Gasto" o "Nuevo Ingreso" según origen | ✅ Implementado |
| Monto grande | Tamaño adaptable según dígitos (36-64px) con `adjustsFontSizeToFit` | ✅ Implementado |
| Campo de texto NLP | Detecta monto, categoría, fecha en tiempo real | ✅ Implementado |
| Selectores rápidos | Fecha, Categoría (grid 8), Cuenta (métodos de pago) | ✅ Implementado |
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
| Transición | 1s de delay → abre formulario con datos pre-llenados | ✅ Implementado |

### 2.4 Configuración (Modal)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Presupuesto mensual | Monto límite mensual para gastos | ✅ Implementado |
| Período de pago | Mensual o Quincenal | ✅ Guardado (cálculo pendiente) |
| Métodos de pago | Agregar/editar/eliminar (modal full-screen) | ✅ Implementado |
| Presupuesto por categoría | Límite por cada una de las 8 categorías (modal full-screen) | ✅ Implementado |
| Apariencia | Sistema / Claro / Oscuro (dark mode completo) | ✅ Implementado |
| Exportar datos | CSV compartible por email, Drive, etc. | ✅ Implementado |
| Limpiar datos | Elimina todas las transacciones (con confirmación) | ✅ Implementado |

### 2.5 Asistente Financiero (Chat)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| NLP local | Preguntas en español: "¿cuánto gasté hoy/este mes?" | ✅ Implementado |
| Tarjeta semanal | Gráfico SVG de 7 días + comparación semana anterior | ✅ Implementado |
| Historial de sesiones | Panel lateral, renombrar, eliminar | ✅ Implementado |
| 100% offline | Sin APIs externas, todo local | ✅ Implementado |

### 2.6 Gráfica de Categorías (Interacciones Avanzadas)

| Sección | Descripción | Estado |
|---------|-------------|--------|
| Barras verticales | Porcentaje según presupuesto o 50% fijo si no hay límite | ✅ Implementado |
| Alertas por color | Base (< 70%), ámbar (70-89%), rojo (≥ 90%) | ✅ Implementado |
| Ghost tracks | Categorías sin movimientos visibles en gris | ✅ Implementado |
| Long-press popup | Editar presupuesto ↑ / Restante (centro) / Nueva transacción ↓ | ✅ Implementado |
| Mini-popup presupuesto | Editar límite inline con preview de barra | ✅ Implementado |
| Scroll horizontal | Deslizar para ver las 8 categorías | ✅ Implementado |

---

## 3. Historias de Usuario

### Épica 1: Registro sin Fricción

| ID | Historia | Estado |
|----|---------|--------|
| HU 1.1 | Como usuario, quiero escribir frases como "Uber 15 mil" en un campo de texto y que se registre automáticamente el monto, categoría y descripción | ✅ |
| HU 1.2 | Como usuario, quiero que el sistema extraiga el monto, la categoría y la fecha de mi texto libre en tiempo real | ✅ |
| HU 1.3 | Como usuario, quiero registrar gastos por voz diciendo "Gasté treinta mil en almuerzo" y que se procese automáticamente | ✅ |
| HU 1.4 | Como usuario, quiero que al decir montos en palabras ("cinco millones 400 mil"), la nota muestre la cifra formateada ($5.400.000) | ✅ |
| HU 1.5 | Como usuario, quiero elegir rápidamente entre Gasto e Ingreso desde el botón + del dock flotante | ✅ |
| HU 1.6 | Como usuario, quiero que los montos se formateen automáticamente con puntos de miles mientras escribo | ✅ |

### Épica 2: Visualización y Control

| ID | Historia | Estado |
|----|---------|--------|
| HU 2.1 | Como usuario, quiero ver mi balance neto (ingresos - gastos) con tipografía grande y clara | ✅ |
| HU 2.2 | Como usuario, quiero una barra de progreso que compare mis gastos con mi presupuesto mensual | ✅ |
| HU 2.3 | Como usuario, quiero filtrar por período (hoy, semana, mes, año) y por categoría | ✅ |
| HU 2.4 | Como usuario, quiero una gráfica de barras que muestre cuánto gasté en cada categoría con alertas visuales | ✅ |
| HU 2.5 | Como usuario, quiero filtrar la vista completa (gráfica + lista) tocando los pills de Gastos o Ingresos | ✅ |
| HU 2.6 | Como usuario, quiero configurar presupuestos por categoría y ver alertas cuando me acerque al límite | ✅ |
| HU 2.7 | Como usuario, quiero dejar presionada una columna de la gráfica para editar su presupuesto o crear una transacción en esa categoría | ✅ |

### Épica 3: Gestión de Transacciones

| ID | Historia | Estado |
|----|---------|--------|
| HU 3.1 | Como usuario, quiero eliminar una transacción deslizando hacia la izquierda en la lista | ✅ |
| HU 3.2 | Como usuario, quiero buscar transacciones por descripción, categoría o tag | ✅ |
| HU 3.3 | Como usuario, quiero ver el historial completo en un modal con filtros por categoría | ✅ |
| HU 3.4 | Como usuario, quiero que la descripción de cada transacción se trunque con "..." si es muy larga | ✅ |

### Épica 4: Asistente y Datos

| ID | Historia | Estado |
|----|---------|--------|
| HU 4.1 | Como usuario, quiero preguntarle al chat "¿cuánto gasté este mes?" y obtener la respuesta | ✅ |
| HU 4.2 | Como usuario, quiero ver un resumen visual de mi semana con gráfico y comparación | ✅ |
| HU 4.3 | Como usuario, quiero exportar mis datos como CSV para tener un respaldo | ✅ |
| HU 4.4 | Como usuario, quiero que toda la app funcione sin internet | ✅ |

### Épica 5: Personalización

| ID | Historia | Estado |
|----|---------|--------|
| HU 5.1 | Como usuario, quiero elegir entre modo claro, oscuro o automático del sistema | ✅ |
| HU 5.2 | Como usuario, quiero configurar mis métodos de pago (Efectivo, Ahorros, Tarjeta, custom) | ✅ |
| HU 5.3 | Como usuario, quiero definir mi presupuesto mensual o quincenal | ✅ (quincenal guardado, cálculo pendiente) |

### Épica 6: Funcionalidades Futuras (No implementadas)

| ID | Historia | Estado |
|----|---------|--------|
| HU 6.1 | Como usuario, quiero definir metas de ahorro y ver mi progreso | ❌ Pendiente (store listo, sin UI) |
| HU 6.2 | Como usuario, quiero que el período quincenal afecte los cálculos de presupuesto (1-15 y 16-fin) | ❌ Pendiente |
| HU 6.3 | Como usuario, quiero ver un desglose de mis ingresos por categoría en la gráfica | ⚠️ Parcial (las categorías de ingresos se muestran si existen) |

> **Nota:** La edición de transacciones fue descartada por diseño. La práctica moderna en apps de finanzas personales es eliminar (swipe-to-delete) y crear una nueva con los datos correctos. Esto simplifica la UX y evita complejidad innecesaria.

---

## 4. Las 8 Categorías Estándar

Conjunto fijo e inmutable. Toda la app (NLP, gráfica, formulario, búsqueda) depende de esta lista:

| Emoji | Nombre | Color | Palabras Clave NLP |
|-------|--------|-------|-------------------|
| 🍔 | Comida | Naranja `#D2601A` | restaurante, almuerzo, cena, pizza, café, mercado, supermercado, domicilio |
| 🚗 | Transporte | Azul `#1565C0` | uber, taxi, bus, metro, gasolina, transporte, moto |
| 🏠 | Hogar | Amarillo `#D97706` | arriendo, luz, agua, gas, internet, servicios, reparación |
| 🛍️ | Compras | Rosa `#C2185B` | ropa, zara, shopping, gadget, tecnología, amazon |
| 🏥 | Salud | Rojo `#C62828` | farmacia, médico, doctor, hospital, clínica, medicamento |
| 🎮 | Entretenimiento | Púrpura `#6D28D9` | netflix, spotify, cine, juego, concierto, teatro, suscripción |
| 🎓 | Educación | Verde `#059669` | curso, libro, universidad, clase, colegio, capacitación |
| 👤 | Personal | Gris `#475569` | personal, peluquería, barbería, belleza, spa |

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

### Micro-interacciones
| Interacción | Efecto |
|-------------|--------|
| Nueva transacción guardada | Vibración háptica `success` |
| Item aparece en lista | `FadeInDown` (Reanimated) |
| Transcripción de voz | Palabra por palabra con `FadeIn.duration(220)` |
| Barra de presupuesto | Animación con `withTiming` al cargar |
| Swipe-to-delete | `PanResponder` + `Animated` revela botón papelera |
| Long-press gráfica | Popup con 3 opciones tras ~400ms |

---

## 6. Reglas de Negocio

### Transacciones
- `amount > 0` = Gasto
- `amount < 0` = Ingreso
- Balance neto = `SUM(amount)` (negativo = saldo positivo para el usuario)
- Se almacenan con fecha ISO local (sin UTC) para evitar desfase horario
- Tags opcionales en formato JSON: `["#trabajo", "#viaje"]`

### Presupuesto
- Presupuesto mensual: valor numérico global, `0` = no configurado
- Presupuesto por categoría: `emoji → monto`, activa alertas en gráfica
- Alertas: < 70% base, 70-89% ámbar, ≥ 90% rojo
- Sin presupuesto: barra al 50% fijo con color base (solo informativo)

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

*Documento de requerimientos actualizado para MyWallet v1.0.0 — Marzo 2026*
