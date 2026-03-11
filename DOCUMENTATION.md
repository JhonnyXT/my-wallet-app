# MyWallet — Guía Completa de Usuario

> **Versión:** 1.0.0 | **Plataforma:** Android (iOS en desarrollo) | **Idioma:** Español

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
9. [Preguntas frecuentes y recomendaciones](#9-preguntas-frecuentes-y-recomendaciones)

---

## 1. Primeros Pasos

Al abrir MyWallet por primera vez, un **tour guiado** te acompañará en los pasos esenciales: configurar tu ingreso mensual, conocer el registro por voz y el registro manual. Puedes seguirlo o saltarlo tocando **"Omitir"** en cualquier momento.

Si prefieres configurar todo manualmente, sigue estos pasos:

### Paso 1 — Define tu ingreso mensual y período de pago
Este es el paso más importante. Sin un presupuesto, las gráficas no muestran alertas ni contexto útil.

1. En **Configuración → Control financiero → Período de pago**, selecciona **Mensual** o **Quincenal** según cómo recibas tus ingresos
2. En **Ingreso mensual** (o "Ingreso quincenal" si elegiste quincenal), ingresa cuánto dinero dispones para gastar **al mes**
   - Si eliges quincenal, la app divide automáticamente el monto entre 2 y calcula el avance en períodos del 1 al 15, y del 16 al final del mes. El subtítulo te muestra el monto por quincena y una referencia al total mensual

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
- **Número grande:** `Ingresos del período - Gastos del período`
- Si es **positivo** → te sobra dinero ese período
- Si es **negativo** → gastaste más de lo que ingresó

### Pills de tipo (↓ Gastos / ↑ Ingresos)
- **Sin selección (por defecto):** La lista y la gráfica muestran todos los movimientos
- **Toca Gastos (↓):** Filtra todo para ver solo tus gastos. El pill se activa en **rojo suave**
- **Toca Ingresos (↑):** Filtra todo para ver solo tus ingresos. El pill se activa en **verde suave**
- **Vuelve a tocar el pill activo:** Desactiva el filtro y regresa a la vista completa

### Barra de progreso del presupuesto
Solo visible si tienes un presupuesto mensual configurado.
- Muestra `X% de $monto_presupuesto` — si tu período es quincenal, el monto se divide automáticamente entre 2
- Se pone **roja** cuando superas el 90% del presupuesto

### Filtro de período
- **Chip de período** (ej: "Este mes") → toca para ver las opciones:
  - Hoy / Ayer / Esta semana / Este mes / Este año / Todo
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
- **Período actual (mes o quincena en curso):** aparecen barras fantasma suaves con un mensaje motivacional centrado: *"Nuevo mes, ¡comienza ahora!"* o *"Nueva quincena, ¡comienza ahora!"*
- **Período pasado:** se muestra *"Sin registros en este período"*

### Lista de transacciones recientes
- Muestra todos los movimientos del período seleccionado
- Cada item aparece como una **tarjeta con fondo blanco y sombra sutil** (modo claro) / fondo oscuro (modo oscuro)
- **Gastos:** monto en negro con signo `−`
- **Ingresos:** monto en verde con signo `+`
- **Desliza izquierda** sobre cualquier registro para ver el botón de eliminar (rojo con ícono de papelera)

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

**Título de la pantalla:** Nuevo Gasto o Nuevo Ingreso (según lo que seleccionaste)

**Campo de monto:**
- Toca el número grande para editarlo directamente
- Se formatea automáticamente con puntos de miles: `20000` → `20.000`
- El tamaño del número **se reduce automáticamente** cuando el monto es muy grande (millones), para que siempre sea visible en pantalla
- Usa el teclado numérico

**Campo de descripción (texto libre con NLP):**
- Escribe en lenguaje natural, por ejemplo:
  - `"Almuerzo en restaurante con compañeros"`
  - `"Uber al aeropuerto ayer 35000"`
  - `"Recibí pago de freelance 200 mil"`
- Mientras escribes, la app **detecta automáticamente:**
  - El monto (actualiza el número grande)
  - La fecha (si mencionas "ayer" o "anteayer")
  - La categoría (según palabras clave)

> ⚠️ **Importante:** Si el NLP detecta un monto en el texto, actualizará el monto en pantalla. Si quieres un monto diferente al escrito en la descripción, ajústalo tocando el número grande después de escribir.

**Selectores rápidos (3 íconos circulares):**

| Ícono | Selector | Opciones |
|-------|----------|----------|
| 📅 Fecha | Hoy / Ayer / Anteayer / Calendario | Por defecto: Hoy |
| 🍽️ Categoría | Grid contextual: 8 categorías si es Gasto, 5 categorías si es Ingreso | Se actualiza automáticamente con el NLP |
| 👛 Cuenta | Tus métodos de pago configurados | Por defecto: el primero disponible |

**Tags (etiquetas):**
- Selecciona tags sugeridos tocándolos: `#viaje`, `#trabajo`, `#comida`, `#salud`, `#ocio`
- Escribe tu propio tag en el campo con el `+` y presiona Enter
- Los tags son útiles para búsquedas específicas más adelante

**Guardar:**
- Toca el botón **✓** (círculo azul, esquina superior derecha)
- El botón aparece gris/deshabilitado si el monto es 0 — debes ingresar un monto primero
- Al guardar: vibración de confirmación + regresa al Dashboard

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
4. La app se **detiene automáticamente** después de 2 segundos de silencio
5. Procesa el audio y abre el formulario con los campos ya llenados
6. Revisa y ajusta si es necesario, luego confirma con **✓**

### Lo que detecta la voz
| Dato | Ejemplos reconocidos |
|------|---------------------|
| **Monto** | "veinte mil", "20 mil", "cinco millones", "5 millones 400 mil", "cuarenta y dos mil" |
| **Tipo** | "gasté/compré/pagué" → Gasto / "recibí/sueldo/quincena/freelance/honorarios" → Ingreso |
| **Fecha** | "hoy" → Hoy / "ayer" → Ayer / "anteayer" → Anteayer |
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

### Consejos para mejor reconocimiento
- Habla con claridad y a velocidad normal
- Para millones, di la cifra completa: "cinco millones cuatrocientos mil" o "5 millones 400 mil"
- Di el monto antes o después de la descripción: "Uber quince mil" o "Quince mil de Uber"
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

- La gráfica cambia automáticamente para mostrar las **5 categorías de ingreso**
- Las barras son **verdes** y proporcionales: la categoría con más ingresos aparece al 100%, las demás escalan relativamente
- No hay presupuesto ni alertas de color en modo ingresos
- Cada barra muestra el porcentaje del total de ingresos del período

### Categorías sin movimientos (ghost bars)
- Aparecen como columnas grises con borde punteado
- Recuerdan que esa categoría existe aunque no tengas movimientos en ella

### Toca una columna — Badge de nombre
- Un **toque corto** en cualquier columna muestra un pequeño badge flotante sobre la columna con el emoji y nombre de la categoría
- El badge desaparece automáticamente después de 1.6 segundos
- Útil para identificar categorías cuando el ícono no es suficientemente claro

### Scroll horizontal
Desliza horizontalmente para ver todas las categorías. Las que tienen movimientos aparecen primero.

### Long-press en una columna (función avanzada)
1. **Mantén presionada** una columna por ~0.4 segundos
2. Aparece un popup con opciones:
   - **↑ Editar presupuesto** → desliza hacia arriba *(solo en modo gastos)*
   - **Monto restante o total** → información del centro
   - **↓ Nueva transacción** → desliza hacia abajo para crear una transacción en esa categoría
3. Al soltar el dedo con una opción seleccionada, se ejecuta la acción

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

### Control Financiero
Opciones visibles directamente en la pantalla de ajustes (en este orden):

| Opción | Descripción |
|--------|-------------|
| Período de pago | **Mensual** (1 al fin de mes) o **Quincenal** (1–15 y 16–fin de mes). Se muestra primero para que el ingreso se adapte automáticamente |
| Ingreso mensual / quincenal | Cuánto dinero tienes disponible para gastar. `0` = sin presupuesto configurado. La etiqueta cambia dinámicamente: muestra **"Ingreso quincenal"** si elegiste período quincenal. El subtítulo muestra el monto del período + referencia "Mensual: $X". Al editar, siempre se pide el **monto mensual** (la app lo divide automáticamente por quincena) |

### Métodos de pago *(abre modal de pantalla completa)*
Toca la tarjeta "Métodos de pago" para abrir el panel de gestión:
- **Agregar:** Toca el botón "Agregar método"
- **Editar:** Toca el nombre o tipo del método
- **Eliminar:** Toca el ícono de papelera (debe quedar mínimo 1; se muestra diálogo de confirmación)
- **Tipos disponibles:** Efectivo, Débito, Ahorros
- Estos aparecerán en el selector "Cuenta" al registrar transacciones

### Presupuesto por categoría *(abre modal de pantalla completa)*
Toca la tarjeta "Presupuesto por categoría" para abrir el panel:
- Lista las 8 categorías de gasto estándar
- Toca cualquiera para ingresar un límite mensual
- El límite se muestra en verde cuando está configurado
- Toca **✗** para quitar el límite de una categoría
- Activa las alertas visuales en la gráfica del Dashboard

### Metas de ahorro
Gestiona tus metas desde la sección "Metas de ahorro":
- **Crear meta:** Toca el botón **"+ Nueva meta"** → ingresa nombre, emoji, monto objetivo
- **Abonar:** Toca el botón **"Abonar"** sobre la meta para agregar dinero al progreso
- **Ver progreso:** Barra de progreso visual con monto acumulado / objetivo
- **Eliminar:** **Desliza la meta hacia la izquierda** para revelar el botón de papelera rojo, luego tócalo para confirmar

### Apariencia
- **Modo oscuro:** Sistema (sigue el tema del dispositivo) / Claro / Oscuro
- El modo oscuro se aplica en **todas las pantallas** de la app: Dashboard, Nuevo Gasto/Ingreso, Historial, Configuración y todos los modales

### Sistema
| Opción | Qué hace |
|--------|---------|
| Exportar datos | Genera un archivo CSV con todas tus transacciones y lo comparte (email, Drive, etc.) |
| Limpiar todos los datos | ⚠️ **Acción irreversible.** Elimina TODAS las transacciones. Muestra un diálogo de confirmación elegante con icono de advertencia antes de proceder |

---

## 8. Categorías de Gasto e Ingreso

MyWallet maneja dos conjuntos de categorías según el tipo de movimiento.

### Categorías de Gasto (8)

El NLP las detecta automáticamente al registrar un gasto:

| Emoji | Nombre | Palabras clave que activan la detección |
|-------|--------|----------------------------------------|
| 🍔 | **Comida** | restaurante, almuerzo, cena, desayuno, pizza, café, mercado, supermercado, domicilio |
| 🚗 | **Transporte** | uber, taxi, bus, metro, gasolina, transporte, moto, peaje, vuelo, parqueadero |
| 🏠 | **Hogar** | arriendo, alquiler, luz, agua, gas, internet, servicios, celular, reparación |
| 🛍️ | **Compras** | zara, ropa, gadget, zapatos, laptop, electrónico, accesorios |
| 🏥 | **Salud** | medicina, médico, doctor, farmacia, droguería, clínica, hospital, cita, EPS |
| 🎮 | **Entretenimiento** | cine, netflix, spotify, juego, PlayStation, Xbox, concierto, teatro, gym |
| 🎓 | **Educación** | curso, libro, universidad, clase, colegio, taller, capacitación |
| 👤 | **Personal** | barbería, peluquería, belleza, deporte, fútbol, cuidado personal |

### Categorías de Ingreso (5)

Aparecen en el selector cuando registras un ingreso y en la gráfica cuando el pill "↑ Ingresos" está activo:

| Emoji | Nombre | Palabras clave que activan la detección |
|-------|--------|----------------------------------------|
| 💼 | **Salario** | salario, sueldo, nómina, quincena, mensualidad, empresa, pago |
| 💻 | **Freelance** | freelance, honorarios, proyecto, cliente, trabajo independiente |
| 📈 | **Inversiones** | inversión, dividendos, rendimientos, intereses, acciones |
| 🎁 | **Extra** | extra, regalo, bono, reembolso, devolución, premio, venta |
| 🏢 | **Negocio** | negocio, local, venta, factura |

> 💡 Si el NLP no detecta ninguna categoría con las palabras que usaste, mantiene la categoría que tenías seleccionada. Puedes cambiarla manualmente en el selector de categoría.

---

## 9. Preguntas Frecuentes y Recomendaciones

### ¿Mis datos están seguros?
Sí. **Todo se almacena localmente en tu dispositivo** en una base de datos SQLite. La app no envía ningún dato a servidores externos ni requiere internet para funcionar.

### ¿Qué pasa si desinstalo la app?
Perderás todos tus datos ya que están en el dispositivo. Antes de desinstalar, usa **Configuración → Exportar datos** para guardar un CSV con tu historial.

### ¿Cómo registro un ingreso?
Toca el **+** del dock flotante → selecciona **Ingreso (verde)**. La pantalla mostrará "Nuevo Ingreso" y el monto aparecerá en verde con signo `+`.

### El NLP detectó mal la categoría, ¿qué hago?
Simplemente toca el selector de **Categoría** (ícono circular en el formulario) y selecciona manualmente la correcta. Los cambios manuales siempre tienen prioridad.

### ¿Puedo editar una transacción ya guardada?
No. MyWallet no tiene edición de transacciones por diseño — simplifica la experiencia. Si cometiste un error, desliza izquierda sobre el registro para eliminarlo y créalo de nuevo con los datos correctos.

### La barra de mi categoría siempre está al 50%, ¿es un error?
No. Cuando no tienes un presupuesto configurado para esa categoría, la barra se muestra al 50% de forma neutra (solo indica que tienes gastos en ella). Para que la barra sea informativa y muestre el % real consumido, configura un límite en **Configuración → Presupuesto por categoría** (toca la tarjeta para abrir el modal de configuración).

### ¿Cómo sé el nombre de una categoría en la gráfica?
Toca (tap corto) sobre cualquier columna de la gráfica. Aparecerá un pequeño badge sobre la columna con el emoji y el nombre de la categoría. Desaparece automáticamente en 1-2 segundos.

### ¿Cómo veo los gastos de un mes anterior (por ejemplo, enero)?
Toca el chip de período (ej: "Este mes") → al fondo de la lista toca **"📅 Elegir mes específico..."** → selecciona el año y luego el mes → toca **✓ Aplicar**. Toda la pantalla (balance, gráfica y lista) se actualiza para mostrar solo ese período.

### ¿Cómo activo el modo oscuro?
Ve a **Configuración → Apariencia** y selecciona la opción que prefieras:
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
| **Balance Neto** | Ingresos − Gastos del período seleccionado |
| **Período** | Ventana de tiempo para filtrar: Hoy, Esta semana, Este mes, un mes/año específico, etc. |
| **NLP** | Procesamiento de Lenguaje Natural — la tecnología que entiende tu texto libre |
| **Tag** | Etiqueta personalizada para organizar transacciones (ej: `#viaje`, `#trabajo`) |
| **Presupuesto por categoría** | Límite de gasto mensual para una categoría específica. Activa alertas en la gráfica |
| **Ghost bar** | Barra de categoría sin gastos. Aparece gris para recordarte que existe esa categoría |
| **Long-press** | Mantener presionado ~0.4 segundos para activar acciones avanzadas |
| **Swipe-to-delete** | Deslizar un item hacia la izquierda para revelar el botón de eliminar (transacciones y metas de ahorro) |
| **Badge de categoría** | Pequeño globo flotante con emoji + nombre que aparece al tocar una columna de la gráfica |
| **Selector de mes/año** | Modal con grid de meses que permite filtrar el Dashboard a un período específico |
| **Diálogo de confirmación** | Ventana emergente minimalista con icono, título y botones (reemplaza las alertas nativas del sistema) |
| **Estado draft** | Cambios pendientes en el selector de mes que solo se aplican al confirmar con "Aplicar" |
| **Ingreso del período** | Monto de presupuesto ajustado al período activo. Si el período es quincenal, equivale a la mitad del ingreso mensual configurado |
| **Guided Tour / Onboarding** | Tour guiado de 5 pasos que aparece la primera vez que abres la app. Te muestra cómo configurar tu ingreso y registrar transacciones |

---

*Documentación generada para MyWallet v1.0.0*
