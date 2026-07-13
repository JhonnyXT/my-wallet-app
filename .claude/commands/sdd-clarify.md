---
description: Resuelve ambigüedades de un spec SDD existente antes de implementar (opcional, tomado de spec-kit)
argument-hint: <nombre o ruta de la feature en specs/>
---

Entra en **SDD_MODE**. Busca el spec en `specs/`: $ARGUMENTS (si no se especifica, usa el más
reciente modificado).

Lee `requirements.md`, `brownfield-impact.md` y `design.md` de esa feature. Este comando existe para
un solo propósito: **de-riesgar ambigüedades antes de `/sdd-build`**, no para regenerar el spec desde
cero.

1. Escanea los 3 archivos buscando:
   - Marcadores `[NEEDS CLARIFICATION: ...]` sin resolver.
   - Requisitos funcionales vagos (verbos sin objeto claro, "debería" sin condición, criterios de
     éxito no medibles).
   - Supuestos en `requirements.md` que impliquen una decisión de producto no obvia (no una decisión
     técnica trivial).

2. Prioriza máximo 3 preguntas por: impacto en alcance > seguridad/privacidad (datos bancarios,
   permisos Android) > experiencia de usuario > detalle técnico. Si hay más de 3 candidatas, descarta
   las de menor impacto y documenta un supuesto razonable para ellas en vez de preguntar.

3. Presenta cada pregunta en este formato (una tabla por pregunta, no un párrafo):

   ```markdown
   ## Pregunta N: [Tema]

   **Contexto**: [cita la sección relevante del spec]

   **Qué necesitamos saber**: [pregunta específica]

   | Opción | Respuesta | Implicación |
   |--------|-----------|-------------|
   | A | [primera opción razonable] | [qué significa para la feature] |
   | B | [segunda opción razonable] | [qué significa para la feature] |
   | Otra | Tú decides | — |
   ```

4. Espera la respuesta del usuario para todas las preguntas juntas antes de continuar.

5. Actualiza `requirements.md` (y `design.md`/`brownfield-impact.md` si la respuesta los afecta)
   reemplazando cada `[NEEDS CLARIFICATION]` resuelto por la decisión tomada. No dejes el marcador ni
   añadas una sección nueva "respuestas" separada — la spec debe quedar como si se hubiera escrito
   bien la primera vez.

6. Si no queda ninguna ambigüedad real, dilo explícitamente y no inventes preguntas — este comando es
   opcional y solo debe usarse cuando hay algo genuino que resolver.

Al terminar, confirma que el spec queda listo para `/sdd-build` (o `/sdd-analyze` si el usuario quiere
una revisión de consistencia cruzada primero).
