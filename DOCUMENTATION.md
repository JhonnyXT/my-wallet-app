# MyWallet — Guía Completa de Usuario

> **Versión:** 1.5.0 | **Plataforma:** Android (iOS en desarrollo) | **Idioma:** Español

---

## ¿Qué es MyWallet?

MyWallet es tu aplicación personal de control financiero. Diseñada para ser **simple, rápida y sin fricciones**, te permite registrar gastos e ingresos con texto libre o voz, visualizar en qué categorías gastas más, establecer presupuestos y tener claridad total de tu dinero — todo almacenado **en tu dispositivo** y funcionando sin internet. Si quieres, inicia sesión con Google para respaldar tus datos en la nube y compartir listas con otras personas.

> **Moneda:** Pesos colombianos ($ COP) | **Datos:** en tu teléfono; respaldo en la nube opcional | **Modo oscuro:** Compatible con tema del sistema

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
11. [Listas y gasto compartido](#11-listas-y-gasto-compartido)
12. [Cuenta y respaldo en la nube](#12-cuenta-y-respaldo-en-la-nube)
13. [Preguntas frecuentes y recomendaciones](#13-preguntas-frecuentes-y-recomendaciones)

---

## 1. Primeros Pasos

Al abrir MyWallet por primera vez pasas por 5 pantallas de bienvenida:
1. **Tu cuenta:** **"Continuar con Google"** para respaldar tu información, o **"Ahora no"** para seguir sin cuenta (puedes iniciar sesión después en Configuración → Cuenta). Si esa cuenta ya tenía información respaldada, la app la recupera y, si ya habías hecho la bienvenida en otro teléfono, entras directo al Dashboard. Ver [Cuenta y respaldo en la nube](#12-cuenta-y-respaldo-en-la-nube).
2. **Categorías:** eliges las categorías de gasto e ingreso que usas.
3. **¿Cuándo y cuánto te pagan?:** eliges cada cuánto te pagan y cuánto (ver [Pago y período](#pago-y-período)). Puedes tocar **"Omitir"**: la app queda en mensual, sin pago configurado, y lo cambias cuando quieras en Configuración.
4. **Detección automática:** te explica cómo la app puede leer las notificaciones de tu banco.
5. **Bancos:** eliges de qué bancos detectar movimientos.

Ya en el Dashboard, un **tour guiado** de 3 pasos te muestra el botón de calendario (tus períodos), el registro por voz y el registro manual. Puedes saltarlo tocando **"Omitir"** en cualquier momento.

Si prefieres configurar todo manualmente, sigue estos pasos:

### Paso 1 — Define cada cuánto y cuánto te pagan
En **Configuración → En tu lista → Pago y período** eliges la frecuencia de tu pago y el monto. Con eso el Dashboard agrupa tus movimientos por período de pago y te muestra cuánto de tu pago llevas gastado.

> 💡 **Recomendación:** Si no sabes cuánto gastas, empieza por registrar todo durante 2 semanas sin presupuesto. Luego usa los datos reales para definir un presupuesto realista.

### Paso 2 — Configura presupuestos por categoría (opcional pero recomendado)
Los presupuestos por categoría activan las alertas visuales en la gráfica:

1. En **Configuración → En tu lista → Presupuestos**, toca la fila para abrir la hoja de presupuestos
2. Dentro de la hoja, toca cada categoría que quieras controlar
3. Ingresa el monto límite mensual para esa categoría
4. Las barras de la gráfica mostrarán en **ámbar** cuando llegues al 70% y en **rojo** al 90%

> 💡 **Ejemplo práctico:** Si tu presupuesto de Comida es $300.000 y llevas $220.000 gastados, la barra mostrará 73% en ámbar — una advertencia visual antes de pasarte.

### Paso 3 — Revisa tus métodos de pago
1. En **Configuración → Gestión → Métodos de pago**, toca la fila para abrir el panel de gestión
2. Verifica que tengas los métodos que usas (Efectivo, Ahorros, Tarjeta)
3. Puedes renombrarlos (ej: "Nequi", "Bancolombia", "Efectivo diario") o agregar nuevos
4. Al registrar cada transacción, indica desde qué cuenta salió el dinero

---

## 2. Pantalla Principal — Dashboard

Es la pantalla que verás al abrir la app. Está organizada en secciones de arriba a abajo:

### Selector de lista ("Personal ▾")
Arriba a la izquierda está el nombre de la lista que estás viendo. Tócalo para cambiar de lista, o para **Compartir** (manda un resumen de la lista por WhatsApp, correo…), **Editar** la lista actual o crear una **Nueva**. Las listas compartidas llevan un ícono de personas. Todo el Dashboard (balance, gráfica, lista) muestra solo lo de la lista elegida. Ver [Listas y gasto compartido](#11-listas-y-gasto-compartido).

### Balance Neto
- **Número grande:** `Ingresos − Gastos` **del período que estés viendo** (el mes, la quincena, el año o el rango que elijas con el botón de calendario).
- Si es **positivo** → en ese período entró más de lo que gastaste
- Si es **negativo** → en ese período gastaste más de lo que entró
- **Saldo total:** debajo del número, tu plata real sobre **todo tu historial**, para no perderla de vista mientras miras otro período. No aparece en la vista "Todo el tiempo", porque ahí coincide con el número grande.
- **Patrimonio neto:** si tienes deudas activas, al lado del saldo total aparece tu saldo menos lo que aún debes.
- **Durante una búsqueda** el número pasa a mostrar el neto de los resultados encontrados (la etiqueta cambia a "BÚSQUEDA · N resultados") y se ocultan el saldo total y el patrimonio neto.

### Deslizar el balance para traer cambios
Si iniciaste sesión, **desliza hacia abajo sobre el balance** y suelta: la app trae lo último de tu cuenta (por ejemplo, lo que registraron las otras personas de una lista compartida o lo que hiciste en otro teléfono). Un anillo se llena mientras deslizas, el teléfono vibra cuando ya puedes soltar y al terminar aparece un ✓. Si no hay conexión aparece una nube tachada; no pasa nada, la app lo vuelve a intentar sola. No funciona mientras buscas o filtras por una categoría.

### Chip de cuentas
En una lista con más personas, bajo los pills aparece un chip con el estado de las cuentas (por ejemplo, **"Ana te debe $X ›"** o **"Están a mano"**). Tócalo para ver el detalle: quién pagó cuánto, cuánto le toca a cada uno y las transferencias para quedar a mano.

### Pills de tipo (↓ Gastos / ↑ Ingresos)
- **Sin selección (por defecto):** La lista y la gráfica muestran todos los movimientos
- **Toca Gastos (↓):** Filtra todo para ver solo tus gastos. El pill se activa en **rojo suave**
- **Toca Ingresos (↑):** Filtra todo para ver solo tus ingresos. El pill se activa en **verde suave**
- **Vuelve a tocar el pill activo:** Desactiva el filtro y regresa a la vista completa

### Barra de tu pago
Visible si configuraste cuánto te pagan (Configuración → Pago y período) y estás viendo un período de pago (no un año ni un rango).
- Muestra `X% de $pago · recibido $Y`: cuánto de tu pago esperado llevas gastado en ese período, y al lado cuánto te ha entrado de verdad.
- Si gastas más que tu pago, arriba del balance aparece el aviso **"$X sobre tu pago"**.
- Se oculta mientras buscas o filtras por gastos/ingresos.

### Períodos: el botón de calendario
Arriba a la derecha, junto a la campana, está el botón de **calendario**:
- **Tócalo** para mostrar u ocultar la **tira de períodos**: una fila deslizable con tus meses (o semanas, quincenas… según cada cuánto te pagan), cada uno con su neto. Desliza y suelta: el período que queda al centro es el que ves. Hay un período de más hacia adelante para que veas lo que viene.
- **Mantenlo presionado** para abrir el menú:
  - **Mes / Semana / 2 semanas / Quincena** (según tu frecuencia): vuelve a los períodos de pago.
  - **Año:** la tira pasa a mostrar años.
  - **Todo el tiempo:** todo tu historial junto.
  - **Rango personalizado…:** abre un calendario; toca el día de inicio y el de fin (o un solo día) y **Aplicar**.
  - **Restablecer predeterminado:** vuelve al período actual (solo aparece si estás viendo otro).
  - **Pago y período:** cambia cada cuánto y cuánto te pagan.
- Cuando no estás en el período actual, el botón muestra un **punto rojo** y una **"x"** al lado: tócala para volver al período actual. Con la tira oculta, debajo aparece el nombre del período que estás viendo; tócalo para volver a mostrar la tira.

> La gráfica de categorías, la lista, el balance y los pills reflejan exactamente el período elegido.

### Gráfica de categorías
Ver sección detallada en [punto 6](#6-gráfica-de-categorías).

### Período sin transacciones
Cuando no hay movimientos en el período seleccionado:
- **Período en curso:** aparecen barras fantasma suaves con un mensaje motivacional centrado: *"Nuevo mes, ¡comienza ahora!"* (o "Nueva semana", "Nuevo período", "Nuevo año", según lo que estés viendo)
- **Período pasado:** se muestra *"Sin registros en este período"*

### Lista de transacciones recientes
- Muestra todos los movimientos del período seleccionado, **agrupados por día**: cada grupo lleva su etiqueta ("Hoy", "Ayer" o la fecha) y el neto de ese día
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

**Lista y Pagó:** si tienes 2 o más listas, arriba de Categoría aparece **LISTA** para elegir en cuál queda el movimiento (empieza en la lista que estás viendo; al editar, puedes moverlo a otra). Si la lista elegida tiene más personas, aparece **PAGÓ** para indicar quién lo pagó ("Tú" va primero).

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

> 💡 La búsqueda funciona sobre el período y tipo actualmente seleccionados. Si estás viendo el mes actual, busca solo dentro de ese mes.

---

## 7. Configuración (Settings)

Accede tocando ⚙️ en la esquina superior derecha del Dashboard.

La pantalla está organizada en secciones, en este orden: **Cuenta** (iniciar sesión con Google,
o tu correo, el estado del respaldo, Cerrar sesión y Eliminar cuenta — ver [Cuenta y respaldo en
la nube](#12-cuenta-y-respaldo-en-la-nube)) → **Listas** (Tus listas) → **En tu
lista** (Categorías, Presupuestos, Pago y período, Mostrar ingresos, Compartir lista, Exportar
CSV, Importar CSV — todo referido a la lista que tienes activa) → **Gestión** (Métodos de pago,
Metas de ahorro, Deudas — comunes a todas tus listas) → **Detección automática** → **Sistema**
(Modo oscuro, Bloqueo con huella, Borrar historial, Versión).

Cada opción que tiene más detalle se abre como una **hoja** que sube desde abajo; la cierras
tocando fuera de ella o deslizándola hacia abajo.

### En tu lista

Estas opciones aplican solo a la lista que tienes activa (su nombre aparece en el título de la
sección). Lo de **Listas**, **Mostrar ingresos**, **Compartir lista** y **Exportar/Importar CSV**
se explica en [Listas y gasto compartido](#11-listas-y-gasto-compartido).

#### Pago y período
Define **cada cuánto te pagan** y **cuánto**. También se abre desde el Dashboard (mantén presionado el botón de calendario → "Pago y período").

- **Frecuencia:**
  - **Semanal** — períodos de 7 días; eliges el día en que empieza la semana.
  - **Cada 2 semanas** — períodos de 14 días; eliges el día de inicio de la semana y si el período actual empezó esta semana o la pasada.
  - **Varias veces al mes** — por ejemplo quincenal: tocas los días en que te pagan (mínimo 2, del 1 al 28); cada uno empieza un período.
  - **Mensual** — por defecto empieza el día 1; con **"Añadir desfase de inicio de mes"** eliges otro día (del 1 al 28), por ejemplo el día que te pagan.
  - **Todo el tiempo** — sin cortes: todo tu historial junto (el calendario navega por meses).
- **¿Cuánto te pagan?** — el monto que recibes en cada período (en "Varias veces al mes", uno por cada día de pago). Se compara con lo que gastas en la barra del Dashboard. Si lo dejas vacío, no hay barra.
- Arriba ves una **vista previa** con tus períodos reales según la frecuencia elegida.
- Toca **Aplicar** para guardar. Cerrar la hoja sin aplicar descarta los cambios.

> ℹ️ Si usas **Mensual con desfase**, tus presupuestos por categoría también se miden de ese día al anterior del mes siguiente (ej. del 15 al 14). Con cualquier otra frecuencia, los presupuestos por categoría siguen siendo por mes calendario.

### Métodos de pago *(abre una hoja)*
Toca la fila "Métodos de pago" (dentro de Gestión) para abrir el panel de gestión:
- **Agregar:** Toca el botón "Agregar método" → nombre, tipo e ícono (sugerido según el nombre)
- **Editar:** Toca el ícono ✏️ del método
- **Eliminar:** Toca el ícono de papelera (debe quedar mínimo 1; se muestra diálogo de confirmación)
- **Tipos disponibles:** Efectivo, Débito, Ahorros
- Estos aparecerán en el selector "Cuenta" al registrar transacciones

### Presupuestos *(abre una hoja)*
Toca la fila "Presupuestos" (dentro de En tu lista) para abrir el panel. Cada lista tiene sus propios presupuestos:
- Lista tus categorías de gasto elegidas
- Toca cualquiera para ingresar un límite mensual
- El límite se muestra en verde cuando está configurado
- Toca **✗** para quitar el límite de una categoría
- Activa las alertas visuales en la gráfica del Dashboard

### Metas de ahorro *(abre una hoja)*
Toca la fila "Metas de ahorro" (dentro de Gestión) para abrir el panel:
- **Crear meta:** Toca **"Nueva meta"** → ingresa nombre, emoji, monto objetivo
- **Editar:** Toca el ícono ✏️ sobre la meta para cambiar nombre, emoji o monto objetivo (no toca lo ya ahorrado)
- **Abonar:** Toca el botón **"Abonar"** sobre la meta para agregar dinero al progreso
- **Ver progreso:** Barra de progreso visual con monto acumulado / objetivo
- **Eliminar:** Toca el ícono 🗑️ sobre la meta — pide confirmación antes de borrarla

> ℹ️ Al abonar a una meta, se registra automáticamente como **gasto** en el Dashboard (con el emoji de la meta, descripción "Abono a [nombre]" y tag `#ahorro`). Esto descuenta el dinero de tu balance disponible.

### Deudas *(abre una hoja)*
Toca la fila "Deudas" (dentro de Gestión) para abrir el panel:
- **Crear deuda:** Toca **"Nueva deuda"** → ingresa nombre, emoji, monto total de la deuda, cuota mensual y el **día del mes** en que se recuerda pagarla (se repite todos los meses, no es una fecha puntual)
- **Editar:** Toca el ícono ✏️ sobre la deuda para cambiar cualquiera de esos datos (no toca el saldo pendiente)
- **Pagar:** Toca el botón **"Pagar"** sobre la deuda para registrar un abono y reducir el saldo pendiente
- **Ver progreso:** Barra de progreso visual con saldo pendiente / monto total. Al llegar a $0, la tarjeta muestra "¡Deuda liquidada!"
- **Eliminar:** Toca el ícono 🗑️ sobre la deuda — pide confirmación antes de borrarla
- **Recordatorio automático:** si tienes las notificaciones activas, recibes un aviso push cada mes en el día de pago elegido ("Cuota de '[nombre]' por vencer"). Al liquidar la deuda por completo recibes otra notificación de felicitación y el recordatorio mensual se cancela solo.

> ℹ️ Al pagar una deuda, se registra automáticamente como **gasto** en el Dashboard (con el emoji de la deuda, descripción "Pago de [nombre]" y tag `#deuda`). Esto descuenta el dinero de tu balance disponible.

> 💡 Si tienes deudas activas, el Dashboard muestra **"Patrimonio neto"** bajo el balance neto: tu saldo total menos el saldo pendiente de todas tus deudas.

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
Cuando se detecta una transacción, aparece un **badge rojo 🔔** sobre el ícono de configuración en el Dashboard, y además recibes una notificación push (si activaste el permiso). Recibes **una sola** notificación por transacción, aunque tu banco la envíe dos veces. El texto muestra el comercio o la persona y el monto (ej. *"Compra en APPLE.COM/BILL · $ 12.900"*, *"Recibiste de Juan Pérez · $ 80.000"*); la referencia a tu tarjeta ("terminada en 1234") nunca se muestra ni se guarda.

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
| Bloqueo con huella | Al activarlo, la app pide tu huella, rostro o PIN del teléfono cada vez que la abres o vuelves a ella. Activarlo y desactivarlo también piden confirmar tu identidad. Si tu teléfono no tiene huella, rostro ni PIN configurados, no se puede activar (la app te avisa) |
| Borrar historial de transacciones | ⚠️ **Acción irreversible.** Desde **Personal**, elimina todos los registros de ingresos y gastos de **todas tus listas**; desde otra lista, solo borra los suyos. Tu configuración (categorías, presupuestos, metas) se conserva intacta. Muestra un diálogo de confirmación antes de proceder |
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

Desde **Configuración → En tu lista → Categorías** se abre la hoja **"Tus categorías"** con las de la lista activa (cada lista tiene las suyas). Toca una para editar su emoji, nombre y color con el slider, o toca el botón **+** de arriba para volver a la pantalla de selección y agregar/quitar categorías.

Al crear o editar una categoría (y también una meta, una deuda o un método de pago), la app te **sugiere íconos según el nombre** que vas escribiendo (por ejemplo, "gimnasio" → 🏋️) y elige el mejor mientras no toques uno a mano.

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
| **Transacción detectada** | Cuando MyWallet identifica una transacción en una notificación bancaria. Al tocarla, te lleva al formulario prellenado (si es la única pendiente) o a la pantalla de revisión (si hay varias) |
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

## 11. Listas y Gasto Compartido

Las **listas** separan tus movimientos en mundos aparte: un viaje, el negocio, los gastos de la casa… Cada lista tiene sus propias categorías, presupuestos y su propio período ("Pago y período").

### Personal y tus otras listas
- **Personal** siempre existe y no se puede borrar. Es "todo tu dinero": muestra sus propios movimientos **más lo que pagaste tú** en cualquier otra lista.
- **Las demás listas** muestran solo lo suyo, sin importar quién pagó.
- Cambias de lista con el botón **"Personal ▾"** del Dashboard o en **Configuración → Tus listas** (toca una para activarla).

### Crear, editar o borrar una lista
1. Dashboard → **"Personal ▾" → Nueva**, o **Configuración → Tus listas → Nueva lista**
2. Escribe el nombre, elige un ícono y, si quieres, agrega **Personas** (quienes también gastan en esa lista; tú ya estás incluido)
3. Toca **"Siguiente: categorías →"**, marca las categorías de la lista y toca **"Crear lista"**. La lista nueva empieza viendo "Todo el tiempo".

Para editarla: Dashboard → "Personal ▾" → **Editar** (o el lápiz junto a la lista activa en "Tus listas"). Al final del editor está **"Eliminar lista"**: borra la lista **y todos sus movimientos**, sin deshacer. No puedes quitar a una persona que ya tiene movimientos registrados.

### Quién pagó y las cuentas
En una lista con personas, cada gasto lleva quién lo pagó (sección **PAGÓ** del formulario). La app reparte **solo los gastos** en partes iguales entre todos (los ingresos no se reparten) y calcula las transferencias mínimas para quedar a mano. El resumen aparece en el **chip de cuentas** del Dashboard (por ejemplo, "Ana te debe $X ›"); tócalo para ver el detalle.

### Opciones de la lista activa (Configuración → En tu lista)
- **Mostrar ingresos:** apágalo en una lista que sea solo de gastos (ej. "la casa"): el Dashboard deja de mostrar sus ingresos en el balance, la gráfica, la tira de períodos y la lista.
- **Compartir lista:** manda un resumen de texto (gastos, ingresos, balance y quién pagó cuánto) por WhatsApp, correo, etc. Desde el menú "Personal ▾" del Dashboard comparte el período que estás viendo; desde Configuración, todo el historial.
- **Exportar CSV:** crea un archivo `.csv` con los movimientos de la lista (incluye método de pago y quién pagó) y lo comparte con la hoja del sistema. Ábrelo en Excel o Google Sheets.
- **Importar CSV:** elige un archivo `.csv` y sus movimientos se agregan a la lista activa, sin duplicar los que ya están (misma fecha, monto y descripción).

### Listas compartidas (cada persona desde su teléfono)
Con una lista compartida, cada persona registra desde **su propio teléfono y su cuenta**, y todos ven lo mismo. Necesitas **sesión iniciada** (Configuración → Cuenta) y **conexión** para compartir o unirte; después, registrar funciona igual sin internet.

**Compartir una lista que creaste:**
1. Abre el editor de la lista (Dashboard → "Personal ▾" → Editar)
2. Toca **"Compartir lista"**
3. Aparece un **código de 6 caracteres** que vence en 7 días. Toca **"Compartir código"** para mandarlo, o díctalo.

Cualquier persona de la lista puede generar un código nuevo con **"Invitar a alguien"** en el mismo editor.

**Unirte con un código:**
1. **Configuración → Tus listas → Unirme con un código**
2. Escribe el código y toca **"Unirme"**
3. Si la lista ya tenía personas agregadas por nombre, la app pregunta **"¿Quién eres?"**: elige tu nombre (lo que esa persona ya había pagado queda como tuyo) o **"Soy otra persona"**

**Qué se comparte y qué no:** el nombre, el ícono, las categorías, "Mostrar ingresos", las personas y los movimientos son de todos. El **período y los presupuestos son de cada uno**. En "Tus listas" una lista compartida dice "Compartida · Tú y N personas", y en el editor un **punto verde** marca a quien ya se unió con la app. Cualquiera de la lista puede editar o borrar cualquier movimiento, como en una lista en papel.

**Ver lo que registran los demás:** los cambios llegan solos al abrir la app o al volver a ella; para traerlos en el momento, [desliza hacia abajo sobre el balance](#deslizar-el-balance-para-traer-cambios).

**Salir, quitar a alguien o eliminar:**
- Si no la creaste tú, el editor muestra **"Salir de la lista"**: dejas de ver lo que registren los demás y la lista se queda en tu teléfono, con lo que ya tenía, como una lista tuya.
- Quien la creó puede quitar a una persona que se unió (la **x** junto a su nombre). Lo que esa persona pagó sigue contando en las cuentas.
- Si la creaste tú, **"Eliminar lista"** la borra **para todos**, con todos sus movimientos.

---

## 12. Cuenta y Respaldo en la Nube

Iniciar sesión es **opcional**: sin cuenta la app funciona completa. Con tu cuenta de Google, tus movimientos, listas, categorías, presupuestos, métodos de pago, metas, deudas y ajustes se respaldan en la nube, los recuperas si cambias de teléfono y puedes compartir listas.

### Iniciar sesión
En la primera pantalla de bienvenida (**"Continuar con Google"**) o después en **Configuración → Cuenta → Iniciar sesión con Google**. Si esa cuenta ya tenía información respaldada, se une con la que tienes en el teléfono, sin perder nada.

### Estado del respaldo
Con sesión iniciada, la sección **Cuenta** muestra tu correo y una fila con el estado: **"Respaldado hace 5 min"**, **"N cambios pendientes"**, **"Sin conexión"** o **"No se pudo respaldar. Toca para reintentar"**. Toca esa fila para respaldar en el momento. El respaldo corre solo en segundo plano: lo que hagas sin internet se sube cuando vuelve la conexión, y nunca tienes que esperarlo para usar la app.

> ℹ️ El texto de las notificaciones de tu banco que aún no has confirmado **no** se sube: solo los movimientos que guardas.

### Cerrar sesión
**Configuración → Cuenta → Cerrar sesión** te pregunta qué hacer con la información del teléfono (en tu cuenta sigue guardada):
- **Mantener en este teléfono:** todo sigue aquí; solo deja de respaldarse.
- **Borrar de este teléfono:** deja la app como recién instalada y vuelve a la bienvenida. Si hay cambios que aún no se respaldaron, no te deja borrar: conéctate primero para subirlos.

### Si el teléfono tiene datos de otra cuenta
Si inicias sesión con una cuenta distinta a la que se usó antes en el teléfono, la app pregunta antes de subir nada: **"Unir con esta cuenta"** o **"Borrar del teléfono y usar esta"** (los datos de la otra cuenta siguen guardados en ella). Si hay cambios sin respaldar de la otra cuenta, solo puedes unir, para no perderlos.

### Eliminar la cuenta
Ver [¿Cómo elimino mi cuenta y mis datos de la nube?](#cómo-elimino-mi-cuenta-y-mis-datos-de-la-nube).

---

## 13. Preguntas Frecuentes y Recomendaciones

### ¿Mis datos están seguros?
Sí. **Todo se guarda primero en tu dispositivo** (base de datos SQLite). Sin sesión iniciada, la app no envía nada a ningún servidor. Si inicias sesión con Google, se sube una copia a Firebase (la nube de Google) que **solo tú puedes ver**, salvo lo que pongas en una lista compartida. El texto de las notificaciones de tu banco nunca se sube, ni se guardan números de cuenta o tarjeta.

### ¿Necesito una cuenta?
No. Iniciar sesión con Google es opcional (primer paso del onboarding, o después en **Ajustes → Cuenta**). Sin cuenta todo funciona igual; con cuenta ganas el respaldo en la nube y las listas compartidas.

### ¿Qué pasa si desinstalo la app o cambio de celular?
Con sesión iniciada, instala la app en el teléfono nuevo, inicia sesión con la misma cuenta de Google y recuperas todo. Sin cuenta, desinstalar borra tus datos: antes usa **Configuración → En tu lista → Exportar CSV** en cada lista para guardar tu historial.

### ¿Cómo elimino mi cuenta y mis datos de la nube?
**Ajustes → Cuenta → Eliminar cuenta.** Borra tu cuenta, todo tu respaldo en la nube y las listas compartidas que creaste; te saca de las listas de otras personas (lo que registraste ahí se queda para que sus cuentas cuadren). Lo que tienes en el teléfono no se borra. Si ya no tienes la app, puedes pedirlo en https://mywallet-blush.vercel.app/es/delete-account.

### ¿Cómo registro un ingreso?
Toca el **+** del dock flotante → selecciona **Ingreso (verde)**. La pantalla mostrará "Nuevo Ingreso" y el monto aparecerá en verde con signo `+`.

### El NLP detectó mal la categoría, ¿qué hago?
Simplemente toca la categoría correcta en la lista horizontal de **Categoría** del formulario. Los cambios manuales siempre tienen prioridad.

### ¿Puedo editar una transacción ya guardada?
Sí. Desliza el registro hacia la **derecha** en el Dashboard para revelar el botón azul de editar (ícono de lápiz) y ajusta lo que necesites — monto, descripción, categoría, cuenta o fecha. Si prefieres, también puedes deslizar hacia la izquierda para eliminarlo y crearlo de nuevo.

### La barra de mi categoría siempre está al 50%, ¿es un error?
No. Cuando no tienes un presupuesto configurado para esa categoría, la barra se muestra al 50% de forma neutra (solo indica que tienes gastos en ella). Para que la barra sea informativa y muestre el % real consumido, configura un límite en **Configuración → En tu lista → Presupuestos**, o mantén presionada la columna → **Agregar presupuesto**.

### ¿Cómo veo solo las transacciones de una categoría?
Toca (tap corto) sobre cualquier columna de la gráfica. La gráfica se ocultará y la lista mostrará solo los movimientos de esa categoría, con un chip arriba indicando cuál está activa. Para volver a la vista normal, toca el botón **Atrás** del dispositivo o **desliza la lista hacia abajo** desde el tope.

### ¿Cómo veo los gastos de un mes anterior (por ejemplo, enero)?
Toca el botón de **calendario** del Dashboard para mostrar la tira de períodos y desliza hacia atrás hasta enero (la tira llega hasta tu primer movimiento, aunque sea de otro año). También puedes mantener presionado el calendario → **Rango personalizado…** y elegir del 1 al 31 de enero. Toda la pantalla (balance, gráfica y lista) se actualiza para mostrar solo ese período; toca la **"x"** junto al calendario para volver al período actual.

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
La primera vez que llegas al Dashboard aparece un **tour guiado** de 3 pasos con un spotlight que resalta elementos clave de la pantalla: el botón de calendario (tus períodos), el registro por voz (micrófono) y el registro manual (botón +). Cada cuánto y cuánto te pagan se configura antes, en las pantallas de bienvenida. Si no quieres seguirlo, toca **"Omitir"** en cualquier paso. El tour no vuelve a aparecer una vez completado o saltado.

### ¿Cómo veo el detalle de una transacción?
Toca (tap) cualquier registro en la lista de transacciones. Se abrirá una tarjeta con toda la información: emoji de categoría, monto, tipo (Gasto/Ingreso), cuenta (método de pago), fecha, hora y descripción. Toca fuera de la tarjeta para cerrarla. Si el item está con el swipe de eliminar abierto, el primer tap cierra el swipe.

### ¿Al abonar a una meta de ahorro se descuenta de mi balance?
Sí. Cada abono crea automáticamente una transacción de gasto, así tu balance refleja que ese dinero ya no está disponible. La transacción aparece en la lista y gráfica del Dashboard con el tag `#ahorro`.

### ¿Funciona sin internet?
Sí, **completa**. Registrar, editar, borrar, reportes, voz y detección bancaria funcionan sin conexión. Si tienes sesión iniciada, lo que hagas sin internet se sube solo cuando vuelve la conexión; en una lista compartida, desliza hacia abajo sobre el balance del Dashboard para traer los cambios de las demás personas. Lo único que necesita internet es iniciar sesión, compartir una lista o unirte a una con un código.

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
  2. Desliza la tira de períodos (botón de calendario) para comparar con períodos anteriores
  3. Ajusta tus hábitos si es necesario

Una vez al mes:
  1. Revisa cuánto de tu pago llevas gastado (barra de pago en el Dashboard)
  2. Si no tienes sesión iniciada, exporta tus datos como backup (Configuración → En tu lista → Exportar CSV, en cada lista)
  3. Ajusta los presupuestos por categoría según el mes anterior
```

---

## Glosario Rápido

| Término | Significado |
|---------|-------------|
| **Gasto** | Dinero que sale de tu bolsillo. Monto positivo en la base de datos |
| **Ingreso** | Dinero que entra (salario, freelance, etc.). Monto negativo en la base de datos |
| **Balance Neto** | Ingresos − Gastos del período que estés viendo en el Dashboard |
| **Saldo total** | Ingresos − Gastos de todo tu historial. Aparece bajo el balance neto |
| **Período** | Ventana de tiempo que muestra el Dashboard: un período de pago (semana, quincena, mes…), un año, todo el tiempo o un rango de fechas |
| **Pago y período** | Ajuste de cada cuánto y cuánto te pagan. Define cómo se agrupan tus movimientos y el pago con el que se compara tu gasto |
| **Tira de períodos** | Fila deslizable bajo los íconos del Dashboard con tus períodos y el neto de cada uno. Se muestra/oculta tocando el botón de calendario |
| **NLP** | Procesamiento de Lenguaje Natural — la tecnología que entiende tu texto libre |
| **Tag** | Etiqueta personalizada para organizar transacciones (ej: `#viaje`, `#trabajo`) |
| **Presupuesto por categoría** | Límite de gasto mensual para una categoría específica. Activa alertas en la gráfica |
| **Ghost bar** | Barra de categoría sin gastos. Aparece gris para recordarte que existe esa categoría |
| **Long-press** | Mantener presionado ~0.4 segundos para activar acciones avanzadas. En la gráfica de categorías activa el popup de "Editar/Agregar presupuesto" + "Nueva transacción" |
| **Tap detalle** | Toque corto en un registro de la lista para abrir el detalle completo (categoría, monto, cuenta, fecha, hora, descripción) |
| **Swipe-to-delete** | Deslizar una transacción del Dashboard hacia la izquierda para revelar el botón de eliminar. Metas de ahorro y deudas usan en cambio íconos ✏️/🗑️ explícitos en la tarjeta, no swipe |
| **Swipe-to-edit** | Deslizar una transacción del Dashboard hacia la **derecha** para revelar el botón azul de editar (ícono de lápiz) y abrir el formulario prellenado |
| **Deuda** | Registro de una deuda (tarjeta de crédito, préstamo, etc.) con monto total, saldo pendiente, cuota mensual y día de pago recurrente. Se gestiona en Ajustes → Deudas |
| **Patrimonio neto** | Saldo total menos el saldo pendiente de todas tus deudas activas. Aparece bajo el balance en el Dashboard solo si tienes deudas registradas |
| **Filtro por categoría** | Tap corto en una columna del CategoryChart filtra la lista a solo esa categoría. Se limpia con el botón Atrás del dispositivo o con un pull-down (deslizar la lista hacia abajo desde el tope) |
| **Pull-down para limpiar filtro** | Gesto de deslizar la lista hacia abajo desde su posición inicial. NO recarga datos (no muestra spinner) — solo limpia el filtro de categoría activo |
| **Ghost bar** | Línea fantasma punteada que aparece detrás del fill de una columna **con presupuesto** marcando el límite. Si te pasas del 100%, sigue indicando exactamente dónde estaba el presupuesto dentro de la barra excedida |
| **Diálogo de confirmación** | Ventana emergente minimalista con icono, título y botones (reemplaza las alertas nativas del sistema) |
| **Bloqueo con huella** | Ajuste que pide huella, rostro o PIN del teléfono al abrir la app o volver a ella |
| **Detalle de transacción** | Tarjeta modal que aparece al hacer tap en un registro, mostrando información completa (categoría, monto, tipo, cuenta, fecha, hora, descripción, tags) |
| **Onboarding** | Las 5 pantallas de bienvenida de la primera vez: cuenta (opcional), categorías, pago, detección automática y bancos |
| **Guided Tour** | Tour guiado de 3 pasos en el Dashboard, justo después del onboarding: botón de calendario, registro por voz y registro manual |
| **Notificación del sistema (push)** | Alerta en la barra de notificaciones del teléfono. MyWallet la usa para: alertas de presupuesto (umbral configurable + 100%), metas de ahorro cumplidas, cuotas de deudas y transacciones bancarias detectadas (al tocarla abre el formulario o la pantalla de revisión) |
| **Alertas de presupuesto** | Configuración en Ajustes con toggle on/off y slider de porcentaje (50–100%, default 80%) que define cuándo se dispara la primera notificación push de presupuesto por categoría |
| **Multi-transacción por voz** | Cuando dices varios montos en un mismo input de voz, la app los detecta y navega a la pantalla "Revisar registros" donde puedes editar, eliminar o agregar más antes de guardar el lote |
| **Revisar registros** | Pantalla de revisión del lote multi-voz o de transacciones detectadas. Tarjetas editables por swipe/edición, botón "Guardar todo" y opción "Añadir registro manual" que lleva al formulario y regresa sin guardar aún en DB |
| **CSV** | Formato de archivo de datos (Comma-Separated Values). "Exportar CSV" crea uno con los movimientos de la lista activa, que se abre en Excel o Google Sheets; "Importar CSV" agrega a la lista activa los movimientos de un archivo |
| **Lista** | Grupo separado de movimientos (un viaje, la casa, el negocio) con sus propias categorías, presupuestos y período. **Personal** siempre existe y muestra todo tu dinero |
| **Lista compartida** | Lista en la que varias personas registran, cada una desde su teléfono y con su cuenta. Se comparte con un código de invitación |
| **Código de invitación** | 6 letras y números (vence en 7 días) para unirse a una lista compartida desde Configuración → Tus listas → Unirme con un código |
| **Cuentas (de una lista)** | Cálculo de quién le debe a quién en una lista con varias personas: reparte los gastos en partes iguales y propone las transferencias para quedar a mano |
| **Respaldo** | Copia en la nube (Firebase, de Google) de tu información, activa solo con sesión iniciada. Se hace solo en segundo plano |
| **Promedios** | Pantalla accesible desde el ícono de gráfica del dock flotante. Muestra el promedio mensual histórico de gasto/ingreso por categoría (siempre sobre todo tu historial, no el período filtrado del Dashboard), con un ranking completo y una tarjeta de tendencia mensual con rango de fechas elegible |

---

*Documentación generada para MyWallet v1.5.0*
