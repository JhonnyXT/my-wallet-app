---
description: Resuelve ambigüedades de un spec SDD existente antes de implementar (opcional, tomado de spec-kit)
---

# /sdd-clarify — Resolver Ambigüedades del Spec

## Instrucciones

Entra en **SDD_MODE**. Si el usuario no indicó qué feature de `specs/` revisar, usa la más reciente
modificada.

### Paso 1 — Leer el spec
Lee `requirements.md`, `brownfield-impact.md` y `design.md` de esa feature. Este comando existe para
**de-riesgar ambigüedades antes de `/sdd-build`**, no para regenerar el spec desde cero.

### Paso 2 — Detectar ambigüedades
Escanea buscando: marcadores `[NEEDS CLARIFICATION: ...]` sin resolver, requisitos vagos (verbos sin
objeto claro, criterios de éxito no medibles), supuestos que impliquen una decisión de producto no
obvia.

### Paso 3 — Priorizar y preguntar (máximo 3)
Prioriza por: alcance > seguridad/privacidad (datos bancarios, permisos Android) > experiencia de
usuario > detalle técnico. Descarta el resto documentando un supuesto razonable. Presenta cada
pregunta como tabla:

| Opción | Respuesta | Implicación |
|--------|-----------|-------------|
| A | ... | ... |
| B | ... | ... |
| Otra | Tú decides | — |

Espera la respuesta de todas las preguntas juntas antes de continuar.

### Paso 4 — Actualizar el spec
Reemplaza cada `[NEEDS CLARIFICATION]` resuelto por la decisión tomada directamente en
`requirements.md` (y `design.md`/`brownfield-impact.md` si aplica) — no agregues una sección
"respuestas" separada.

Si no hay ninguna ambigüedad real, dilo explícitamente y no inventes preguntas. Al terminar, confirma
que el spec queda listo para `/sdd-build` (o `/sdd-analyze` si se quiere revisión de consistencia
primero).
