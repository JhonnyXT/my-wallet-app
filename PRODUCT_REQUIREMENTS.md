# MyWallet - Conceptualización de Producto (MVP)

## 1. Visión y Filosofía del Producto
**MyWallet** es un diario de gastos elegante y ultrarrápido diseñado para eliminar por completo la fricción del registro manual de finanzas. No es una herramienta contable abrumadora, sino una experiencia premium enfocada en la velocidad y la simplicidad.

*   **Principio de diseño:** Minimalismo funcional. Cualquier acción que no contribuya a registrar un gasto en menos de 3 segundos queda descartada.
*   **Estética:** Interfaz limpia y profesional, inspirada en aplicaciones de lujo y productividad de alto nivel. Uso estratégico del espacio negativo, tipografías modernas (sans-serif geométricas) y micro-interacciones fluidas (háptica sutil, animaciones elásticas).

---

## 2. Arquitectura de Información (IA)

La estructura de la aplicación es plana y directa. No hay menús de hamburguesa ni navegaciones complejas.

*   **Pantalla de Inicio (Dashboard)**
    *   **Balance Actual:** Gran tipografía destacando el gasto total del mes en curso.
    *   **Barra de Presupuesto:** Una línea de progreso delgada y minimalista debajo del balance que indica el límite de gasto mensual.
    *   **Historial Reciente:** Lista limpia de las transacciones recientes (Monto, Descripción, Icono/Emoji de Categoría).
    *   **El Protagonista (Action Area):** Un campo de entrada (input) o Botón Flotante (FAB) predominante en la parte inferior, siempre accesible.

*   **Pantalla/Estado de Registro (Modal / Bottom Sheet)**
    *   Campo de texto único con auto-foco (despliega el teclado inmediatamente).
    *   Soporte nativo para dictado por voz del teclado.
    *   Feedback visual instantáneo que muestra cómo el NLP extrae: `[Categoría]`, `[Descripción]` y `[Monto]`.

*   **Pantalla de Configuración (Accesible vía icono discreto)**
    *   Definición del límite de presupuesto mensual.
    *   Ajustes básicos (moneda, tema).

---

## 3. Historias de Usuario Clave (MVP)

**Épica 1: Registro NLP (Natural Language Processing) sin Fricción**
*   **HU 1.1:** Como usuario, quiero tener un único campo de texto para escribir frases como "Súper 45" de modo que no tenga que navegar por múltiples campos (monto, fecha, nombre).
*   **HU 1.2:** Como usuario, quiero que el sistema extraiga automáticamente el monto y la descripción de mi texto, para registrar el gasto en menos de 3 segundos.
*   **HU 1.3:** Como usuario, quiero que el sistema sugiera o asigne automáticamente una categoría (ej. "Restaurante" al escribir "Pizza") para mantener mis gastos organizados sin esfuerzo manual.
*   **HU 1.4:** Como usuario, quiero poder usar el dictado de mi teléfono en el campo de texto para registrar gastos hablando naturalmente (ej: "Gasolina 60 mil").

**Épica 2: Visualización y Control Minimalista**
*   **HU 2.1:** Como usuario, quiero ver mi gasto total del mes actual en la parte superior de la pantalla de inicio con una tipografía grande y clara.
*   **HU 2.2:** Como usuario, quiero ver una barra de progreso sutil que compare mis gastos con mi límite mensual, para saber visualmente si estoy cerca de excederme.
*   **HU 2.3:** Como usuario, quiero ver una lista de mis transacciones más recientes con mucho espacio en blanco, sin gráficos de torta ni reportes densos, para una lectura relajante.

---

## 4. Guía de Estilo Visual y UX/UI

### Flujo de Usuario: "El botón es el protagonista"
El objetivo es **0 clics para empezar a escribir**. 
Al abrir la app, el foco visual y funcional está en la parte inferior. Un input text expansivo que dice *"¿Qué compraste hoy?"*. Al tocarlo (o incluso con auto-focus al abrir la app), el teclado sube al instante. El usuario escribe "Uber 15", presiona "Enter", una suave vibración háptica confirma la acción, y el gasto aparece mágicamente en la lista con el balance actualizado.

### Paleta de Colores
Un enfoque monocromático profesional que transmite calma y control, con un color de acento reservado solo para acciones críticas o estado del presupuesto.
*   **Fondo (Background):** Blanco Nieve (`#FFFFFF`) o un Gris Perla muy tenue (`#FBFBFD`) para máxima limpieza.
*   **Texto Principal (Balances, Montos):** Negro Medianoche o Gris Carbón (`#1C1C1E`).
*   **Texto Secundario (Descripciones, Fechas):** Gris Plata (`#8E8E93`).
*   **Acento Principal (Botón de Agregar / Enter):** Negro Puro (`#000000`) para un look premium y de alto contraste.
*   **Feedback de Presupuesto (Barra de progreso):** 
    *   *Saludable:* Negro o Gris oscuro.
    *   *Advertencia (Cerca del límite):* Un naranja/coral sutil y elegante (`#FF6B6B`).

### Tipografía
Tipografías modernas, geométricas y sin serifa que ofrezcan una excelente legibilidad de los números.
*   **Fuentes recomendadas:** *Inter*, *SF Pro Display* (iOS nativo), o *Golos Text*.
*   **Jerarquía:** Pesos gruesos (*Bold* o *Semibold*) para los montos y el balance principal; pesos regulares (*Regular* o *Medium*) para los nombres de los gastos.

### Componentes de UI ("Encantadora pero Limpia")
*   **Tarjetas de Transacción:** Sin bordes duros. Solo el texto levitando sobre el fondo, o separadores de línea ultra-delgados (`1px` gris muy claro). 
*   **Iconografía:** Minimalista. Preferiblemente emojis nativos del sistema rodeados por un círculo gris claro suave (para las categorías) para darle un toque "encantador" y familiar sin recargar la interfaz.
*   **Espacio Negativo:** Márgenes amplios (ej. `24px` o `32px` de padding lateral). El contenido debe respirar, evitando la saturación cognitiva.
*   **Micro-interacciones:** Transición elástica (spring animation) al aparecer una nueva transacción en la lista. Fade-in suave al actualizar el balance.
