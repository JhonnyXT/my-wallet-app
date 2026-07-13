---
description: Verifica consistencia entre requirements/design/tasks/test-plan antes de implementar (opcional, tomado de spec-kit)
---

# /sdd-analyze — Análisis de Consistencia Cruzada

## Instrucciones

Entra en **SDD_MODE**. Si el usuario no indicó qué feature de `specs/` revisar, usa la más reciente
modificada. Lee los 5 artefactos (`requirements.md`, `brownfield-impact.md`, `design.md`, `tasks.md`,
`test-plan.md`). Este comando solo reporta discrepancias, no reescribe el spec.

### Paso 1 — Cobertura requisito → tarea → prueba
Cada `RF-XXX` de `requirements.md` debe tener al menos una tarea en `tasks.md` y una fila en
`test-plan.md`. Reporta requisitos huérfanos y tareas huérfanas.

### Paso 2 — Consistencia de alcance
Lo que `design.md` propone no debe contradecir lo que `requirements.md` marcó como excluido.

### Paso 3 — Impacto no declarado
Si `design.md` toca un archivo/módulo que no aparece en `brownfield-impact.md`, señálalo.

### Paso 4 — Ambigüedades sin resolver
Marcadores `[NEEDS CLARIFICATION]` que sobrevivieron → sugiere `/sdd-clarify`.

### Paso 5 — Reglas inmutables
Cualquier requisito o decisión que viole las "Reglas inmutables" de `AGENTS.md` (offline-first,
formato COP, fechas locales, no-edición de transacciones, no datos bancarios sensibles) es
**bloqueante** — repórtalo con prioridad crítica.

### Paso 6 — Reportar
Tabla: `# | Categoría | Severidad | Ubicación | Descripción | Sugerencia`. Severidad: crítico / alto /
medio / bajo. Si no hay hallazgos, dilo explícitamente. Si hay hallazgos crítico/alto, recomienda no
correr `/sdd-build` todavía y qué artefacto corregir primero.
