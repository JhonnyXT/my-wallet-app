# MyWallet — Guía Completa de Usuario

> **Versión:** 1.5.0 | **Plataforma:** Android (iOS en desarrollo) | **Idioma:** Español

---

## ¿Qué es MyWallet?

MyWallet es tu aplicación personal de control financiero. Diseñada para ser **simple, rápida y sin fricciones**, te permite registrar gastos e ingresos con texto libre o voz, visualizar en qué categorías gastas más, establecer presupuestos y tener claridad total de tu dinero — todo almacenado **localmente en tu dispositivo**, sin servidores ni suscripciones.

> **Moneda:** Pesos colombianos ($ COP) | **Datos:** 100% locales, sin nube | **Modo oscuro:** Compatible con tema del sistema

---

## Índice

1. [Primeros pasos (configuración inicial recomendada)](#1-primeros-pasos)
2. [Pantalla principal — Dashboard](#2-pantalla-principal--dashboard)
3. [Registrar un gasto o ingreso](#3-registrar-un-gasto-o-ingreso)
4. [Entrada por voz](#4-entrada-por-voz)
5. [Gráfica de categorías](#5-gráfica-de-categorías)
6. [Búsqueda](#6-búsqueda)
7. [Configuración (Settings)](#7-configuración-settings)
8. [Categorías de gasto e ingreso](#8-categorías-de-gasto-e-ingreso)
9. [Sistema de notificaciones](#9-sistema-de-notificaciones)
10. [Promedios (Reportes)](#10-promedios-reportes)
11. [Preguntas frecuentes y recomendaciones](#11-preguntas-frecuentes-y-recomendaciones)

---

## 1. Primeros Pasos

Al abrir MyWallet por primera vez, un **tour guiado** te acompañará en los pasos esenciales: configurar tu ingreso mensual, conocer el registro por voz y el registro manual. Puedes seguirlo o saltarlo tocando **"Omitir"** en cualquier momento.

Si prefieres configurar todo manualmente, sigue estos pasos:

### Paso 1 — Define tu ingreso mensual
Este es el paso más importante. Sin un presupuesto, las gráficas no muestran alertas ni contexto útil.

En **Configuración → Control financiero → Ingreso mensual**, ingresa cuánto dinero dispones para gastar al mes.

> 💡 **Recomendación:** Si no sabes cuánto gastas, empieza por registrar todo durante 2 semanas sin presupuesto. Luego usa los datos reales para definir un presupuesto realista.

### Paso 2 — Configura presupuestos por categoría (opcional pero recomendado)
Los presupuestos por categoría activan las alertas visuales en la gráfica:

1. En **Configuración → Presupuesto por categoría**, toca la tarjeta para abrir la pantalla de configuración
2. Dentro del modal, toca cada categoría que quieras controlar
3. Ingresa el monto límite mensual para esa categoría
4. Las barras de la gráfica mostrarán en **ámbar** cuando llegues al 70% y en **rojo** al 90%

> 💡 **Ejemplo práctico:** Si tu presupuesto de Comida es $300.000 y llevas $220.000 gastados, la barra mostrará 73% en ámbar — una advertencia visual antes de pasarte.

### Paso 3 — Revisa tus métodos de pago
1. En **Configuración → Métodos de pago**, toca la tarjeta para abrir el panel de gestión
2. Verifica que tengas los métodos que usas (Efectivo, Ahorros, Tarjeta)
3. Puedes renombrarlos (ej: "Nequi", "Bancolombia", "Efectivo diario") o agregar nuevos
4. Al registrar cada transacción, indica desde qué cuenta salió el dinero

---

## 2. Pantalla Principal — Dashboard

Es la pantalla que verás al abrir la app. Está organizada en secciones de arriba a abajo:

### Balance Neto
- **Número grande:** `Ingresos totales - Gastos totales`, sobre **todo tu historial** — no cambia aunque filtres por mes/año en la gráfica de abajo, es tu plata real en este momento.
- Si es **positivo** → tenés más de lo que has gastado
- Si es **negativo** → has gastado más de lo que ha entrado
- **Durante una búsqueda** es la única excepción: el número pasa a mostrar el neto de los resultados encontrados (la etiqueta cambia a "BÚSQUEDA · N resultados" para que quede claro que no es tu balance total).
- Los pills "↓ Gastos / ↑ Ingresos" de abajo sí muestran el total **del período que estés viendo** — son cosas distintas a propósito: el Balance Neto es "cuánta plata tenés", los pills son "cuánto gastaste/ingresaste este mes".

### Pills de tipo (↓ Gastos / ↑ Ingresos)
- **Sin selección (por defecto):** La lista y la gráfica muestran todos los movimientos
- **Toca Gastos (↓):** Filtra todo para ver solo tus gastos. El pill se activa en **rojo suave**
- **Toca Ingresos (↑):** Filtra todo para ver solo tus ingresos. El pill se activa en **verde suave**
- **Vuelve a tocar el pill activo:** Desactiva el filtro y regresa a la vista completa

### Barra de progreso del presupuesto
Solo visible si tienes un presupuesto mensual configurado.
- Muestra `X% de $monto_presupuesto` (porcentaje del presupuesto mensual consumido)
- Se pone **roja** cuando superas el 90% del presupuesto

### Filtro de período
- **Chip de período** (ej: "Este mes") → toca para ver las opciones:
  - Hoy / Esta semana / Esta quincena / Este mes / Este año / Todo
  - **📅 Elegir mes específico...** → abre el selector de mes/año
- El chip muestra la etiqueta dinámica del período activo: "Este mes", "Abr 2025", "2025", etc.

### Selector de mes/año
Al tocar **"📅 Elegir mes específico..."** se abre un panel donde puedes:
1. Seleccionar el **año** con las pills (2025, 2024, 2023…) o "Todo el tiempo" para quitar el filtro
2. Tocar el **mes** que quieres ver — debajo de cada mes aparece el total de gastos de ese período
3. Los **meses futuros** aparecen deshabilitados
4. Toca **✓ Aplicar** para confirmar — el chip del Dashboard mostrará "Abr 2025" o "2025"
5. La **X** cierra sin aplicar cambios

> Una vez aplicado, la gráfica de categorías, la lista de transacciones y el balance reflejan exactamente el mes elegido.

### Gráfica de categorías
Ver sección detallada en [punto 6](#6-gráfica-de-categorías).

### Período sin transacciones
Cuando no hay movimientos en el período seleccionado:
- **Período actual (mes en curso):** aparecen barras fantasma suaves con un mensaje motivacional centrado: *"Nuevo mes, ¡comienza ahora!"*
- **Período pasado:** se muestra *"Sin registros en este período"*

### Lista de transacciones recientes
- Muestra todos los movimientos del período seleccionado
- Cada item aparece como una **tarjeta con fondo blanco y sombra sutil** (modo claro) / fondo oscuro (modo oscuro)
- Cada registro muestra la fecha exacta en que fue creado (ej: "3 mar 2026")
- **Gastos:** monto en negro con signo `−`
- **Ingresos:** monto en verde con signo `+`
- **Toca** cualquier registro para ver el **detalle completo**: emoji, monto, categoría, tipo, cuenta (método de pago), fecha, hora y descripción
- **Desliza izquierda** sobre cualquier registro para ver el botón de eliminar (rojo con ícono de papelera) — pide confirmación antes de borrar
- **Desliza derecha** sobre cualquier registro para ver el botón de editar (azul con ícono de lápiz) — abre el formulario "Editar Gasto/Ingreso" con todos los campos prellenados

---

## 3. Registrar un Gasto o Ingreso

### Método 1 — Botón flotante (+)
1. Toca el botón **+** del dock flotante (parte inferior de la pantalla)
2. Aparece un menú con dos opciones:
   - 🟢 **Ingreso** → para registrar dinero que entra (salario, freelance, venta, etc.)
   - 🔴 **Gasto** → para registrar dinero que sale (comida, transporte, etc.)
3. Selecciona la opción correspondiente

### Método 2 — Desde la gráfica (long-press)
1. Mantén presionada una columna de la gráfica
2. Desliza hacia **abajo** para "Nueva transacción" en esa categoría
3. Se abre el formulario con la categoría pre-seleccionada

### En el formulario de transacción

**Título de la pantalla:** Nuevo Gasto o Nuevo Ingreso (según lo que seleccionaste), o **Editar Gasto/Editar Ingreso** si llegaste deslizando un registro existente hacia la derecha. Solo tiene un botón atrás en el header — sin botón de guardar arriba.

**Tarjeta principal (importe + descripción + fecha):**
- **Importe:** toca el número grande para editarlo directamente. Mientras escribes ves solo los dígitos (sin puntos), para que puedas corregir un número en medio del monto sin que el cursor salte; al salir del campo se formatea con puntos de miles: `20000` → `20.000`. El tamaño del número **se reduce automáticamente** cuando el monto es muy grande (millones), para que siempre sea visible en pantalla. Usa el teclado numérico.
- **Descripción:** toca la fila con el ícono de documento para abrir un panel colapsable con un campo de texto libre (con NLP) y los tags. Escribe en lenguaje natural, por ejemplo `"Almuerzo en restaurante con compañeros"` o `"Uber al aeropuerto ayer"`. Mientras escribes, la app detecta automáticamente la **fecha** (si mencionas "ayer"/"anteayer") y la **categoría** (según palabras clave) y actualiza esos selectores solos.
  > ℹ️ El **monto ya no se sincroniza** desde el texto de la descripción — tiene su propio campo editable independiente (el número grande de arriba). Escribir un monto en la descripción es solo texto libre, no cambia el importe de la transacción.
- **Fecha:** toca la fila con el ícono de calendario para abrir un calendario mensual (por defecto: hoy). No permite seleccionar fechas futuras. Selecciona y cierra en el mismo toque, con un chip "Hoy" de acceso directo.

**Categoría:** lista horizontal siempre visible debajo de la tarjeta, con tus categorías elegidas + un ítem "Nueva" (ícono `+`) al final para crear una al vuelo. Toca cualquiera para seleccionarla directamente — no hay sheet ni confirmación aparte.

**Cuenta:** lista vertical siempre visible con tus métodos de pago configurados (por defecto: el primero disponible). Toca cualquiera para seleccionarla. Debajo hay un enlace **"Gestionar métodos de pago"** que abre un panel para agregar/editar cuentas sin salir del formulario.

> ℹ️ El método de pago seleccionado en "Cuenta" queda registrado junto con la transacción.

**Tags (etiquetas):** dentro del panel de descripción —
- Selecciona tags sugeridos tocándolos: `#viaje`, `#trabajo`, `#comida`, `#salud`, `#ocio`
- Escribe tu propio tag en el campo con el `+` y presiona Enter
- Los tags son útiles para búsquedas específicas más adelante

**Guardar:**
- Toca el botón **Guardar** (azul, fijo en la parte inferior de la pantalla — se mantiene visible al hacer scroll)
- El botón aparece gris/deshabilitado si el monto es 0 — debes ingresar un monto primero
- Al guardar: vibración de confirmación + regresa al Dashboard. En modo edición, actualiza el registro existente en lugar de crear uno nuevo.

### Editar una transacción existente

1. En el Dashboard, **desliza cualquier registro hacia la derecha** para revelar el botón azul de editar (ícono de lápiz)
2. Toca el botón — se abre el mismo formulario ("Editar Gasto"/"Editar Ingreso") con monto, descripción, categoría, cuenta, fecha y tags ya prellenados
3. Ajusta lo que necesites y toca **Guardar** — actualiza el registro (no crea uno nuevo)

---

## 4. Entrada por Voz

La entrada por voz es la forma más rápida de registrar un movimiento.

### Cómo usarla
1. Toca el **botón de micrófono** azul en el dock flotante (el FAB grande)
2. La pantalla oscura con el orb se abre automáticamente y empieza a escuchar
3. Di en voz alta algo como:
   - `"Gasté treinta mil en almuerzo hoy"`
   - `"Taxi veinte mil quinientos"`
   - `"Recibí doscientos mil de freelance"`
   - `"Supermercado ochenta y cinco mil ayer"`
   - `"Gasté 30 mil en almuerzo y 15 mil en café"` *(múltiples gastos)*
4. La app se **detiene automáticamente** después de 2 segundos de silencio
5. Procesa el audio y:
   - Si detectó **una sola transacción** → abre el formulario con los campos ya llenados para que revises y confirmes con **✓**
   - Si detectó **varias transacciones** → abre la pantalla **"Revisar registros"** (ver abajo)
6. En el flujo de una transacción: revisa y ajusta si es necesario, luego confirma con **✓**

### Lo que detecta la voz
| Dato | Ejemplos reconocidos |
|------|---------------------|
| **Monto** | "veinte mil", "20 mil", "cinco millones", "5 millones 400 mil", "cuarenta y dos mil" |
| **Tipo** | "gasté/compré/pagué" → Gasto / "recibí/sueldo/quincena/freelance/honorarios" → Ingreso |
| **Fecha** | "hoy" → Hoy |
| **Categoría (gastos)** | "taxi/uber/gasolina" → Transporte / "restaurante/almuerzo" → Comida / etc. |
| **Categoría (ingresos)** | "sueldo/nomina" → 💼 Salario / "freelance/honorarios" → 💻 Freelance / "dividendos" → 📈 Inversiones / etc. |

### Conversión automática de texto a número
Cuando el monto se dice en palabras, la app lo **convierte automáticamente a dígitos formateados** en el campo de nota. Ejemplos:

| Dices | La nota muestra |
|-------|----------------|
| "ayer recibí cinco millones 400 mil de la empresa" | "ayer recibí $5.400.000 de la empresa" |
| "gasté 40 mil en almuerzo" | "gasté $40.000 en almuerzo" |
| "taxi veinte mil quinientos" | "taxi $20.500" |

Así el texto queda limpio y legible, sin palabras numéricas.

### Tamaño del monto adaptable
El número grande del formulario **reduce su tamaño automáticamente** cuando el monto tiene muchos dígitos (millones, miles de millones), para que siempre sea visible y no se salga de la pantalla.

### Registro de múltiples transacciones con una sola frase

Puedes mencionar varios gastos o ingresos en un solo input de voz. La app detecta los montos y te lleva a una **pantalla de revisión** donde puedes editar, eliminar o agregar más antes de guardar todo de golpe.

**Ejemplos de frases:**
- `"Gasté treinta mil en almuerzo y quince mil en café"`
- `"Pagué 80 mil de gasolina y también 12 mil de parqueadero"`
- `"Mercado 95 mil, café 8 mil y transporte 6.500"`

> 💡 Puedes decir los montos en palabras ("treinta mil", "quince mil") o en números ("30 mil", "15.000") — la app entiende ambos formatos.

**Qué pasa al terminar la grabación:**
1. La app detecta que hay varios montos y abre la pantalla **"Revisar registros"**
2. Cada transacción detectada aparece como una **tarjeta editable**
3. Revisa y ajusta lo que necesites antes de confirmar

### Pantalla "Revisar registros"

Esta pantalla aparece automáticamente cuando el input de voz contiene ≥ 2 transacciones.

**Qué puedes hacer en cada tarjeta:**
- Tocar el **ícono ✏️** para editar: monto, descripción, tipo (Gasto/Ingreso) o categoría
- **Deslizar la tarjeta hacia la izquierda** para eliminarla del lote

**Agregar un registro adicional:**
- Toca **"Añadir registro manual"** al final de la lista
- Se abre el formulario estándar "Nuevo Gasto/Ingreso"
- Al guardar, el registro **vuelve a la pantalla de revisión** como una tarjeta más — no se guarda todavía en la base de datos
- Así puedes agregar todos los que quieras y guardar todo junto al final

**Guardar todo:**
1. El footer muestra: `"N registros · Total $ X"`
2. Toca **✓ Guardar todo** — se guardan todas las tarjetas a la vez en un solo paso
3. Vuelves al Dashboard al terminar
4. Si necesitas eliminar alguna transacción guardada por error, usa el swipe izquierdo en la lista del Dashboard

> 💡 Si mencionas varias cosas del mismo tipo (todos gastos o todos ingresos), no necesitas repetir "gasté" en cada una — la app hereda el tipo de la primera frase.

### Consejos para mejor reconocimiento
- Habla con claridad y a velocidad normal
- Para millones, di la cifra completa: "cinco millones cuatrocientos mil" o "5 millones 400 mil"
- Di el monto antes o después de la descripción: "Uber quince mil" o "Quince mil de Uber"
- Separa múltiples gastos con "y", "también", "además", "luego" o "después"
- Si el reconocimiento no fue preciso, puedes editar el texto en el formulario que se abre

> ℹ️ **Nota:** El reconocimiento de voz requiere una **build nativa** de la app. En Expo Go no está disponible.

---

## 5. Gráfica de Categorías

La gráfica de barras verticales es el centro visual del Dashboard. Muestra cómo se distribuye tu dinero.

### Modo Gastos (por defecto o pill ↓ activo)

**Sin presupuesto configurado para una categoría:**
- La barra aparece al **50% fijo** con el color base de la categoría
- Muestra solo el monto gastado (ej: `45k`)
- No hay alertas — es solo información

**Con presupuesto configurado:**
- La barra sube de 0% a 100% según `gastado / presupuesto`
- Muestra el porcentaje consumido (ej: `73%`) + el monto
- Colores de alerta automáticos:
  - **Color base** → menos del 70% del presupuesto consumido ✅
  - **Ámbar** → entre 70% y 89% consumido ⚠️
  - **Rojo** → 90% o más consumido 🚨

### Modo Ingresos (pill ↑ activo)

- La gráfica cambia automáticamente para mostrar tus **categorías de ingreso**
- Las barras son **verdes** y proporcionales: la categoría con más ingresos aparece al 100%, las demás escalan relativamente
- No hay presupuesto ni alertas de color en modo ingresos
- Cada barra muestra el porcentaje del total de ingresos del período

### Categorías sin movimientos (ghost bars)
- Aparecen como columnas con el emoji en gris claro y un guion `—` en lugar de monto
- Recuerdan que esa categoría existe aunque no tengas movimientos en ella

### Orden de las columnas
1. Primero, las categorías **con presupuesto configurado** (con su línea fantasma del límite)
2. Luego, las categorías **con gasto pero sin presupuesto** (en gris neutro adaptable al tema)
3. Por último, las **vacías** (solo en modo gastos)

### Toca una columna — Filtrar por categoría *(nuevo)*
- Un **toque corto** en cualquier columna **filtra la lista** para mostrar solo las transacciones de esa categoría:
  - La gráfica se oculta para dar más espacio a la lista
  - Aparece un chip arriba con el emoji y el nombre de la categoría activa
  - La cabecera de sección cambia al nombre de la categoría
- **Para limpiar el filtro y volver a la vista normal:**
  - Toca el botón **Atrás** del dispositivo, o
  - **Desliza la lista hacia abajo** desde el tope (sin spinner — el filtro se quita al soltar)

### Scroll horizontal
Desliza horizontalmente para ver todas las categorías.

### Long-press en una columna (función avanzada)
1. **Mantén presionada** una columna por ~0.4 segundos
2. Aparece un popup con opciones:
   - **↑ Agregar presupuesto** → si esa categoría aún no tiene límite configurado *(solo en modo gastos)*
   - **↑ Editar presupuesto** → si ya tiene un límite configurado *(solo en modo gastos)*
   - **Monto restante o total** → información del centro
   - **↓ Nueva transacción** → desliza hacia abajo para crear una transacción en esa categoría
3. Al soltar el dedo con una opción seleccionada, se ejecuta la acción
4. Si sueltas sin elegir nada, el popup se cierra y **no** se aplica el filtro de categoría

**Editar presupuesto inline:**
- Se abre un mini-modal directamente en la pantalla
- Ingresa el nuevo límite de presupuesto
- La barra de progreso se actualiza en tiempo real mientras escribes
- Toca **Actualizar** para guardar o **Cancelar** para cerrar

---

## 6. Búsqueda

### Cómo activar la búsqueda
Toca el ícono de **lupa (🔍)** en el dock flotante. Una barra de búsqueda aparece en la parte inferior de la pantalla.

### Tipos de búsqueda

| Qué buscas | Cómo escribirlo | Ejemplo |
|-----------|----------------|---------|
| Por descripción | Escribe texto libre | `restaurante` |
| Por categoría | Escribe el nombre | `transporte` |
| Por tag | Empieza con `#` | `#trabajo` |

### Comportamiento
- La búsqueda **filtra en tiempo real** mientras escribes
- El balance en la parte superior se actualiza para mostrar los totales de los resultados
- El label cambia a "BÚSQUEDA · N resultados"
- Para cerrar la búsqueda: toca el botón **✗** circular al final de la barra

> 💡 La búsqueda funciona sobre el período y tipo actualmente seleccionados. Si tienes activo "Este mes", busca solo dentro de este mes.

---

## 7. Configuración (Settings)

Accede tocando ⚙️ en la esquina superior derecha del Dashboard.

La pantalla está organizada en secciones, en este orden: **Control financiero** (Ingreso
mensual) → **Gestión** (Categorías, Métodos de pago, Presupuesto por categoría, Metas de
ahorro, Deudas) → **Detección automática** → **Sistema** (Modo oscuro, Exportar datos,
Borrar historial, Versión).

### Control Financiero
Opciones visibles directamente en la pantalla de ajustes (en este orden):

| Opción | Descripción |
|--------|-------------|
| Ingreso mensual | Cuánto dinero tienes disponible para gastar al mes. `0` = sin presupuesto configurado. |

### Métodos de pago *(abre modal de pantalla completa)*
Toca la tarjeta "Métodos de pago" para abrir el panel de gestión:
- **Agregar:** Toca el botón "Agregar método"
- **Editar:** Toca el nombre o tipo del método
- **Eliminar:** Toca el ícono de papelera (debe quedar mínimo 1; se muestra diálogo de confirmación)
- **Tipos disponibles:** Efectivo, Débito, Ahorros
- Estos aparecerán en el selector "Cuenta" al registrar transacciones

### Presupuesto por categoría *(abre modal de pantalla completa)*
Toca la tarjeta "Presupuesto por categoría" para abrir el panel:
- Lista tus categorías de gasto elegidas
- Toca cualquiera para ingresar un límite mensual
- El límite se muestra en verde cuando está configurado
- Toca **✗** para quitar el límite de una categoría
- Activa las alertas visuales en la gráfica del Dashboard

### Metas de ahorro *(abre modal de pantalla completa)*
Toca la fila "Metas de ahorro" (dentro de Gestión) para abrir el panel:
- **Crear meta:** Toca **"Nueva meta"** → ingresa nombre, emoji, monto objetivo
- **Editar:** Toca el ícono ✏️ sobre la meta para cambiar nombre, emoji o monto objetivo (no toca lo ya ahorrado)
- **Abonar:** Toca el botón **"Abonar"** sobre la meta para agregar dinero al progreso
- **Ver progreso:** Barra de progreso visual con monto acumulado / objetivo
- **Eliminar:** Toca el ícono 🗑️ sobre la meta — pide confirmación antes de borrarla

> ℹ️ Al abonar a una meta, se registra automáticamente como **gasto** en el Dashboard (con el emoji de la meta, descripción "Abono a [nombre]" y tag `#ahorro`). Esto descuenta el dinero de tu balance disponible.

### Deudas *(abre modal de pantalla completa, nuevo)*
Toca la fila "Deudas" (dentro de Gestión) para abrir el panel:
- **Crear deuda:** Toca **"Nueva deuda"** → ingresa nombre, emoji, monto total de la deuda, cuota mensual y el **día del mes** en que se recuerda pagarla (se repite todos los meses, no es una fecha puntual)
- **Editar:** Toca el ícono ✏️ sobre la deuda para cambiar cualquiera de esos datos (no toca el saldo pendiente)
- **Pagar:** Toca el botón **"Pagar"** sobre la deuda para registrar un abono y reducir el saldo pendiente
- **Ver progreso:** Barra de progreso visual con saldo pendiente / monto total. Al llegar a $0, la tarjeta muestra "¡Deuda liquidada!"
- **Eliminar:** Toca el ícono 🗑️ sobre la deuda — pide confirmación antes de borrarla
- **Recordatorio automático:** si tienes las notificaciones activas, recibes un aviso push cada mes en el día de pago elegido ("Cuota de '[nombre]' por vencer"). Al liquidar la deuda por completo recibes otra notificación de felicitación y el recordatorio mensual se cancela solo.

> ℹ️ Al pagar una deuda, se registra automáticamente como **gasto** en el Dashboard (con el emoji de la deuda, descripción "Pago de [nombre]" y tag `#deuda`). Esto descuenta el dinero de tu balance disponible.

> 💡 Si tienes deudas activas, el Dashboard muestra una línea adicional **"Patrimonio neto"** bajo el balance neto: tu balance disponible menos el saldo pendiente de todas tus deudas.

### Alertas de presupuesto *(nuevo)*

Configura cuándo y cómo recibir notificaciones push relacionadas con tus presupuestos por categoría:

1. **Toggle "Alertas de presupuesto"** — Activa o desactiva todas las alertas push de presupuesto.
   - Al activarlo por primera vez, el sistema pedirá permiso de notificaciones. Si rechazas, abre la configuración del sistema automáticamente para que actives el permiso manualmente.
2. **Slider de porcentaje** — Define el umbral de aviso. Por defecto, recibes la primera alerta al **80%** del presupuesto de una categoría. Puedes ajustarlo de **50% a 100%** según prefieras.
3. **Segunda alerta automática** — Si superas el 100% del presupuesto, recibes una segunda notificación independiente para tomar acción inmediata.

> 💡 Si solo quieres saber cuándo te pasas (y no antes), pon el slider en 100%. Solo recibirás la notificación de "presupuesto superado".

### Detección automática *(nuevo en v1.5.0)*

MyWallet puede detectar transacciones directamente desde las notificaciones de tus apps bancarias y mostrarte un resumen para que las confirmes antes de guardar.

**¿Cómo activarlo?**
1. En Configuración, desplázate hasta la sección **"Detección automática"**
2. Activa el toggle **"Detectar transacciones"**
3. Aparecerá un diálogo explicativo — toca **"Abrir ajustes"**
4. En los ajustes del sistema, busca **"MyWallet"** y activa el acceso a notificaciones
5. Vuelve a la app — el toggle quedará activo
6. Si es la primera vez que la app pide notificaciones (y no las activaste antes desde "Alertas de presupuesto"), el sistema también pedirá el permiso normal de notificaciones — acéptalo para que te avise por push cada vez que detecte una transacción

> ℹ️ El acceso a notificaciones (paso 4) y el permiso de notificaciones push (paso 6) son dos permisos distintos de Android: el primero permite que la app *lea* las notificaciones bancarias; el segundo permite que la app *te avise* con un push cuando detecta una transacción. Si solo activas el primero, las transacciones detectadas seguirán apareciendo en la pantalla de revisión, pero no recibirás el aviso push.

**¿Qué bancos son compatibles?**
Bancolombia, Nequi, Davivienda, DaviPlata, BBVA, Banco de Occidente, Banco Popular, AV Villas, Nubank, Lulo Bank, Scotiabank Colpatria, Rappi Pay, Tpaga, Banco de Bogotá, Itaú.

Puedes elegir **solo algunos bancos** tocando la opción "Bancos activos". Si no seleccionas ninguno, se usarán todos.

**¿Cómo funciona la revisión?**
Cuando se detecta una transacción, aparece un **badge rojo 🔔** sobre el ícono de configuración en el Dashboard, y además recibes una notificación push (si activaste el permiso).

- **Si es la única transacción pendiente**, tocar la notificación push te lleva **directo al formulario** ("Nuevo Gasto"/"Nuevo Ingreso") con el monto, la categoría y la fecha real de detección ya cargados — solo revisa y toca **✓** para guardar. Cerrar sin guardar no la descarta: sigue disponible en el badge 🔔.
- **Si hay más de una pendiente**, la notificación te lleva a la pantalla de revisión (o tocá el badge 🔔 en cualquier momento para verlas todas):
  - Cada transacción muestra el banco, la descripción, el monto
  - La fecha guardada es la fecha real en que llegó la notificación bancaria, no el día en que la revisas
  - Puedes **editar** la transacción (monto, descripción, categoría, tipo, fecha)
  - Puedes **eliminar** una transacción con el ícono de papelera 🗑️ junto al de editar
  - Puedes **descartar todas de una vez** con el ícono de papelera 🗑️ del encabezado — pide confirmación antes de vaciar la cola
  - Cuando todo está listo, toca **"Guardar todo"**

**¿Qué datos se procesan?**
Solo el monto y el nombre del comercio. Nunca se lee el saldo disponible, números de tarjeta ni datos personales. Todo el procesamiento ocurre localmente en tu dispositivo.

**Si la detección deja de funcionar en background**
Algunos fabricantes (Samsung, Xiaomi, Huawei...) detienen apps en segundo plano para ahorrar batería, lo que puede interrumpir la detección aunque el permiso siga activo. Si notas que se te escapan transacciones, entra manualmente a Ajustes del sistema → Batería → MyWallet y elige "Sin restricciones".

> ⚠️ Si reinstalas la app (por ejemplo al actualizar manualmente el APK), Android revoca automáticamente el acceso a notificaciones — es normal, solo repite los pasos de activación de arriba.

### Sistema
| Opción | Qué hace |
|--------|---------|
| Modo oscuro | Sistema (sigue el tema del dispositivo) / Claro / Oscuro — se aplica en **todas las pantallas** de la app |
| Exportar datos | Genera un CSV con todas tus transacciones (id, fecha, tipo, descripción, categoría, monto, método de pago, tags) y abre el diálogo nativo del sistema para compartirlo (email, WhatsApp, Drive, copiar, etc.) |
| Borrar historial de transacciones | ⚠️ **Acción irreversible.** Elimina todos los registros de ingresos y gastos. Tu configuración (categorías, presupuestos, metas) se conserva intacta. Muestra un diálogo de confirmación antes de proceder |
| Versión | Solo informativa — la versión instalada de la app |

---

## 8. Categorías Personalizables

MyWallet te permite **elegir y crear tus propias categorías** de gasto e ingreso desde tres lugares diferentes.

### Primera vez: Selección de categorías

La primera vez que abres la app, después de la pantalla de bienvenida, aparece la pantalla de **selección de categorías**:

1. Verás una cuadrícula de tarjetas con las categorías predefinidas (18 de gasto, 6 de ingreso)
2. Toca las que quieras usar — se marcan con un check
3. Al final hay una tarjeta con "+" para **crear una categoría personalizada**
4. En el popup de creación elige un emoji, arrastra el **slider de color** para elegir el tono que quieras, y escribe un nombre
5. Toca **Guardar** para confirmar tu selección

### Crear una categoría mientras registras una transacción *(nuevo)*

No tienes que salir del formulario para agregar una categoría nueva:

1. En la pantalla **Nuevo Gasto / Nuevo Ingreso**, en la lista horizontal de **Categoría** hay un ítem **"Nueva"** con un ícono `+` al final
2. Tócalo — se abre directo el modal de creación (sin sheet intermedio)
3. Elige emoji, color (slider) y nombre → **Guardar**
4. La nueva categoría queda **autoseleccionada** en la transacción que estabas creando

### Editar categorías después

Desde **Configuración > Mis categorías** puedes ver tus categorías actuales y tocar **"Gestionar categorías"** para volver a la pantalla de selección y agregar/quitar categorías. Al editar una categoría existente puedes cambiar su emoji, nombre y color con el slider.

### El selector de color (slider de tono)

Al crear o editar una categoría, en lugar de una paleta fija verás una **barra de colores degradada**:
- Desliza el pulgar a lo largo de la barra para elegir cualquier tono
- El círculo de previsualización (con el emoji) actualiza el color en tiempo real
- El color de fondo y el color de acento se derivan automáticamente del tono elegido

### Categorías y NLP

Cada categoría tiene palabras clave que el NLP detecta automáticamente. Las categorías predefinidas ya vienen con keywords, y las que crees tú usarán tu nombre como keyword.

> Si el NLP no detecta ninguna categoría, mantiene la que tenías seleccionada. Puedes cambiarla manualmente en el selector de categoría.

---

## 9. Sistema de Notificaciones

MyWallet usa **exclusivamente notificaciones del sistema (push)** para los eventos importantes. No verás avisos efímeros dentro de la app — la pantalla principal queda limpia y sin interrupciones.

### Tipos de notificaciones push

| Evento | Cuándo |
|--------|--------|
| **Alerta de presupuesto** | Cuando alcanzas el porcentaje configurado de gasto en una categoría (default 80%) |
| **Presupuesto superado** | Cuando superas el 100% del presupuesto de una categoría — segunda notificación tras la del umbral |
| **Meta de ahorro cumplida** | Cuando el monto acumulado de una meta llega al objetivo |
| **Transacción detectada** | Cuando MyWallet identifica una transacción en una notificación bancaria. Al tocarla, te lleva directo a la pantalla de revisión |
| **Cuota de deuda por vencer** *(nuevo)* | Cada mes, en el día de pago que definiste para una deuda |
| **Deuda liquidada** *(nuevo)* | Cuando el saldo pendiente de una deuda llega a $0 |

### Permisos
La primera vez que actives "Alertas de presupuesto" o "Detección automática", el sistema te pedirá permiso para mostrar notificaciones. Si rechazas con "No volver a preguntar", la app abre la configuración del sistema para que lo actives manualmente.

> ℹ️ Cada alerta de presupuesto se muestra **una vez por categoría por mes** para el umbral, y **una vez por categoría por mes** para el rebase del 100%. No recibirás notificaciones repetidas.

### Errores críticos
Cuando hay un error que requiere tu atención (por ejemplo, no se pudo guardar un lote de transacciones), aparece un **diálogo nativo** del sistema con título y botón **OK**. Estos errores son raros y se registran para diagnóstico.

---

## 10. Promedios (Reportes)

MyWallet incluye una pantalla dedicada a responder "¿en qué gasto o gano más, en promedio?" — algo distinto de la gráfica del Dashboard, que solo muestra totales del período que tengas filtrado en ese momento.

### Cómo acceder
Toca el ícono de **gráfica** (📊) en el dock flotante, junto a la lupa. Se abre la pantalla **"Promedios"**.

### Qué muestra
1. **Gastos / Ingresos:** un toggle arriba te deja alternar entre ver el promedio de tus gastos o de tus ingresos.
2. **Tarjeta principal:** el promedio mensual general (todo tu historial, sin importar el período que tengas filtrado en el Dashboard), tu categoría con mayor promedio y cuántos meses se analizaron. A la derecha, un anillo muestra qué porción de tu promedio total corresponde a esa categoría top.
3. **Categorías #2 y #3:** dos tarjetas con las siguientes categorías del ranking (si tienes al menos 3 categorías con datos).
4. **Tendencia:** un gráfico de barras con el total gastado/recibido mes a mes. Toca el chip **"N meses ▾"** para elegir el rango de fechas que quieres ver en este gráfico — accesos rápidos de 3/6/12 meses, o elige un rango personalizado tocando el calendario (el rango completo entre el día de inicio y el de fin se resalta como una sola franja continua). Este es el único filtro de período de la pantalla y solo afecta esta tarjeta. El rango personalizado debe abarcar **al menos 2 meses distintos** — si eliges dos días dentro del mismo mes, el botón "Aplicar" se deshabilita (el gráfico de barras no tiene sentido con un solo mes para comparar).
5. **Ranking de categorías:** la lista completa, de mayor a menor promedio mensual, con una barra de progreso relativa a la categoría top.

> ℹ️ El promedio siempre se calcula sobre **todo tu historial** (a diferencia del resto de la app, que respeta el período que tengas filtrado en el Dashboard) — esto es intencional: un promedio recortado a "este mes" dejaría de ser un promedio útil.

### Si no tienes suficiente historial
Si aún no hay transacciones, verás el mensaje "Aún no hay suficiente historial para calcular promedios" en el ranking.

---

## 11. Preguntas Frecuentes y Recomendaciones

### ¿Mis datos están seguros?
Sí. **Todo se almacena localmente en tu dispositivo** en una base de datos SQLite. La app no envía ningún dato a servidores externos ni requiere internet para funcionar.

### ¿Qué pasa si desinstalo la app?
Perderás todos tus datos ya que están en el dispositivo. Antes de desinstalar, usa **Configuración → Exportar datos** para guardar un CSV con tu historial.

### ¿Cómo registro un ingreso?
Toca el **+** del dock flotante → selecciona **Ingreso (verde)**. La pantalla mostrará "Nuevo Ingreso" y el monto aparecerá en verde con signo `+`.

### El NLP detectó mal la categoría, ¿qué hago?
Simplemente toca la categoría correcta en la lista horizontal de **Categoría** del formulario. Los cambios manuales siempre tienen prioridad.

### ¿Puedo editar una transacción ya guardada?
Sí. Desliza el registro hacia la **derecha** en el Dashboard para revelar el botón azul de editar (ícono de lápiz) y ajusta lo que necesites — monto, descripción, categoría, cuenta o fecha. Si prefieres, también puedes deslizar hacia la izquierda para eliminarlo y crearlo de nuevo.

### La barra de mi categoría siempre está al 50%, ¿es un error?
No. Cuando no tienes un presupuesto configurado para esa categoría, la barra se muestra al 50% de forma neutra (solo indica que tienes gastos en ella). Para que la barra sea informativa y muestre el % real consumido, configura un límite en **Configuración → Presupuesto por categoría** (toca la tarjeta para abrir el modal de configuración).

### ¿Cómo veo solo las transacciones de una categoría?
Toca (tap corto) sobre cualquier columna de la gráfica. La gráfica se ocultará y la lista mostrará solo los movimientos de esa categoría, con un chip arriba indicando cuál está activa. Para volver a la vista normal, toca el botón **Atrás** del dispositivo o **desliza la lista hacia abajo** desde el tope.

### ¿Cómo veo los gastos de un mes anterior (por ejemplo, enero)?
Toca el chip de período (ej: "Este mes") → al fondo de la lista toca **"📅 Elegir mes específico..."** → selecciona el año y luego el mes → toca **✓ Aplicar**. Toda la pantalla (balance, gráfica y lista) se actualiza para mostrar solo ese período.

### ¿Cómo activo el modo oscuro?
Ve a **Configuración → Sistema → Modo oscuro** y selecciona la opción que prefieras:
- **Sistema:** sigue automáticamente el tema del teléfono
- **Claro:** siempre en modo claro
- **Oscuro:** siempre en modo oscuro

El modo oscuro se aplica en todas las pantallas, incluyendo el formulario de Nuevo Gasto/Ingreso, los modales y el historial.

### ¿La voz convierte las palabras a números automáticamente?
Sí. Cuando dices el monto en palabras (ej: "cinco millones cuatrocientos mil"), la nota del formulario mostrará directamente `$5.400.000`. No necesitas decir el número dígito por dígito.

### ¿Cuántas transacciones puedo registrar?
No hay límite técnico. La base de datos SQLite puede manejar millones de registros sin problema.

### ¿Qué es el tour inicial?
La primera vez que abres MyWallet aparece un **tour guiado** de 5 pasos con un spotlight que resalta elementos clave de la pantalla. Te lleva a configurar tu ingreso mensual, te muestra el registro por voz (micrófono) y el registro manual (botón +). Si no quieres seguirlo, toca **"Omitir"** en cualquier paso. El tour no vuelve a aparecer una vez completado o saltado.

### ¿Cómo veo el detalle de una transacción?
Toca (tap) cualquier registro en la lista de transacciones. Se abrirá una tarjeta con toda la información: emoji de categoría, monto, tipo (Gasto/Ingreso), cuenta (método de pago), fecha, hora y descripción. Toca fuera de la tarjeta para cerrarla. Si el item está con el swipe de eliminar abierto, el primer tap cierra el swipe.

### ¿Al abonar a una meta de ahorro se descuenta de mi balance?
Sí. Cada abono crea automáticamente una transacción de gasto, así tu balance refleja que ese dinero ya no está disponible. La transacción aparece en la lista y gráfica del Dashboard con el tag `#ahorro`.

### ¿Funciona sin internet?
Sí, la app es **100% offline**. El reconocimiento de voz, el NLP y todos los cálculos son locales. No necesitas internet para nada.

---

## Flujo de Uso Recomendado (Rutina Diaria)

```
Al hacer un gasto/ingreso:
  1. Tap en + → Gasto o Ingreso
  2. Escribe la descripción en lenguaje natural
  3. Verifica que el monto, fecha y categoría sean correctos
  4. Confirma con ✓

Una vez por semana:
  1. Revisa la gráfica del Dashboard — ¿alguna categoría en ámbar o rojo?
  2. Filtra por "Esta semana" para ver solo los movimientos recientes
  3. Ajusta tus hábitos si es necesario

Una vez al mes:
  1. Revisa el presupuesto general (barra de progreso en el Dashboard)
  2. Exporta tus datos como backup (Configuración → Exportar)
  3. Ajusta los presupuestos por categoría según el mes anterior
```

---

## Glosario Rápido

| Término | Significado |
|---------|-------------|
| **Gasto** | Dinero que sale de tu bolsillo. Monto positivo en la base de datos |
| **Ingreso** | Dinero que entra (salario, freelance, etc.). Monto negativo en la base de datos |
| **Balance Neto** | Ingresos − Gastos de todo tu historial (no cambia con el período que estés filtrando) |
| **Período** | Ventana de tiempo para filtrar: Hoy, Esta semana, Este mes, un mes/año específico, etc. |
| **NLP** | Procesamiento de Lenguaje Natural — la tecnología que entiende tu texto libre |
| **Tag** | Etiqueta personalizada para organizar transacciones (ej: `#viaje`, `#trabajo`) |
| **Presupuesto por categoría** | Límite de gasto mensual para una categoría específica. Activa alertas en la gráfica |
| **Ghost bar** | Barra de categoría sin gastos. Aparece gris para recordarte que existe esa categoría |
| **Long-press** | Mantener presionado ~0.4 segundos para activar acciones avanzadas. En la gráfica de categorías activa el popup de "Editar/Agregar presupuesto" + "Nueva transacción" |
| **Tap detalle** | Toque corto en un registro de la lista para abrir el detalle completo (categoría, monto, cuenta, fecha, hora, descripción) |
| **Swipe-to-delete** | Deslizar una transacción del Dashboard hacia la izquierda para revelar el botón de eliminar. Metas de ahorro y deudas usan en cambio íconos ✏️/🗑️ explícitos en la tarjeta, no swipe |
| **Swipe-to-edit** | Deslizar una transacción del Dashboard hacia la **derecha** para revelar el botón azul de editar (ícono de lápiz) y abrir el formulario prellenado |
| **Deuda** | Registro de una deuda (tarjeta de crédito, préstamo, etc.) con monto total, saldo pendiente, cuota mensual y día de pago recurrente. Se gestiona en Ajustes → Deudas |
| **Patrimonio neto** | Balance neto menos el saldo pendiente de todas tus deudas activas. Aparece bajo el balance en el Dashboard solo si tienes deudas registradas |
| **Filtro por categoría** | Tap corto en una columna del CategoryChart filtra la lista a solo esa categoría. Se limpia con el botón Atrás del dispositivo o con un pull-down (deslizar la lista hacia abajo desde el tope) |
| **Pull-down para limpiar filtro** | Gesto de deslizar la lista hacia abajo desde su posición inicial. NO recarga datos (no muestra spinner) — solo limpia el filtro de categoría activo |
| **Ghost bar** | Línea fantasma punteada que aparece detrás del fill de una columna **con presupuesto** marcando el límite. Si te pasas del 100%, sigue indicando exactamente dónde estaba el presupuesto dentro de la barra excedida |
| **Selector de mes/año** | Modal con grid de meses que permite filtrar el Dashboard a un período específico |
| **Diálogo de confirmación** | Ventana emergente minimalista con icono, título y botones (reemplaza las alertas nativas del sistema) |
| **Estado draft** | Cambios pendientes en el selector de mes que solo se aplican al confirmar con "Aplicar" |
| **Detalle de transacción** | Tarjeta modal que aparece al hacer tap en un registro, mostrando información completa (categoría, monto, tipo, cuenta, fecha, hora, descripción, tags) |
| **Guided Tour / Onboarding** | Tour guiado de 5 pasos que aparece la primera vez que abres la app. Te muestra cómo configurar tu ingreso y registrar transacciones |
|| **Notificación del sistema (push)** | Alerta en la barra de notificaciones del teléfono. MyWallet la usa para: alertas de presupuesto (umbral configurable + 100%), metas de ahorro cumplidas y transacciones bancarias detectadas (con deep link a la pantalla de revisión) |
|| **Alertas de presupuesto** | Configuración en Ajustes con toggle on/off y slider de porcentaje (50–100%, default 80%) que define cuándo se dispara la primera notificación push de presupuesto por categoría |
|| **Multi-transacción por voz** | Cuando dices varios montos en un mismo input de voz, la app los detecta y navega a la pantalla "Revisar registros" donde puedes editar, eliminar o agregar más antes de guardar el lote |
|| **Revisar registros** | Pantalla de revisión del lote multi-voz o de transacciones detectadas. Tarjetas editables por swipe/edición, botón "Guardar todo" y opción "Añadir registro manual" que lleva al formulario y regresa sin guardar aún en DB |
|| **CSV** | Formato de exportación de datos (Comma-Separated Values). Abre en Excel o Google Sheets como tabla con todas tus transacciones |
| **Promedios** | Pantalla accesible desde el ícono de gráfica del dock flotante. Muestra el promedio mensual histórico de gasto/ingreso por categoría (siempre sobre todo tu historial, no el período filtrado del Dashboard), con un ranking completo y una tarjeta de tendencia mensual con rango de fechas elegible |

---

*Documentación generada para MyWallet v1.5.0*
