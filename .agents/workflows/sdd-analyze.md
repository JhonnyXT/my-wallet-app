Entra en **SDD_MODE**. Busca el spec en `specs/`: $ARGUMENTS (si no se especifica, usa el más
reciente modificado).

Lee los 5 artefactos de la feature (`requirements.md`, `brownfield-impact.md`, `design.md`,
`tasks.md`, `test-plan.md`) y revisa consistencia cruzada — este comando no reescribe el spec, solo
detecta y reporta discrepancias para que el usuario decida cómo resolverlas.

Verifica específicamente:

1. **Cobertura requisito → tarea**: cada `RF-XXX` de `requirements.md` tiene al menos una tarea en
   `tasks.md` que lo implementa, y al menos una fila en `test-plan.md` que lo valida. Reporta
   requisitos huérfanos (sin tarea) y tareas huérfanas (sin requisito que las motive).
2. **Cobertura requisito → prueba**: cada fila de `test-plan.md` corresponde a un `RF-XXX` real, no a
   uno inventado o ya eliminado del requirements.
3. **Consistencia de alcance**: lo que `design.md` propone implementar no contradice lo que
   `requirements.md` marcó como "excluye explícitamente".
4. **Impacto no declarado**: si `design.md` toca un archivo o módulo que no aparece en la tabla de
   `brownfield-impact.md`, señálalo.
5. **Ambigüedades sin resolver**: marcadores `[NEEDS CLARIFICATION]` que sobrevivieron — si existen,
   sugiere correr `/sdd-clarify` antes de continuar.
6. **Contradicción con reglas del proyecto**: cualquier requisito o decisión de diseño que viole las
   "Reglas inmutables" de `AGENTS.md` (offline-first, formato COP, fechas locales, no-edición de
   transacciones, no datos bancarios sensibles) — esto es bloqueante, repórtalo con prioridad alta.

Presenta el resultado como una tabla:

| # | Categoría | Severidad | Ubicación | Descripción | Sugerencia |
|---|-----------|-----------|-----------|-------------|------------|

Severidad: `crítico` (bloquea `/sdd-build`, ej. viola una regla inmutable), `alto` (requisito sin
tarea/prueba), `medio` (inconsistencia menor de alcance), `bajo` (redacción ambigua sin impacto real).

Si no hay hallazgos, dilo explícitamente en una línea — no inventes problemas para justificar el
comando. Si hay hallazgos `crítico` o `alto`, recomienda no correr `/sdd-build` todavía y decir
exactamente qué artefacto corregir primero.
