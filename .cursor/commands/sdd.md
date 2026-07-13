---
description: Inicia un flujo Spec-Driven Development (SDD) para una feature o cambio en MyWallet
---

# /sdd — Iniciar Spec-Driven Development

## Instrucciones

Entra en **SDD_MODE**. Si el usuario no dio el objetivo de la feature en el mensaje, pregúntalo antes
de continuar.

Este proyecto es frontend puro (React Native + Expo, sin backend) — no apliques Clean/Hexagonal
Architecture de servidor. Organiza el diseño por capas de la app: pantalla (Expo Router) → store
(Zustand) → acceso a datos (SQLite/AsyncStorage) → componentes UI, siguiendo `AGENTS.md` y
`.cursor/rules/*.mdc`.

### Paso 1 — requirements.md
Objetivo, alcance (qué incluye / qué excluye explícitamente), historias de usuario **priorizadas e
independientemente probables** (P1/P2/P3), requisitos funcionales numerados y testeables, criterios
de éxito medibles y agnósticos de implementación, casos borde, supuestos.

- Máximo 3 marcadores `[NEEDS CLARIFICATION: pregunta específica]`, priorizados por: alcance >
  seguridad/privacidad > experiencia de usuario > detalle técnico. Lo que tenga un default razonable
  según convenciones del proyecto va en "Supuestos", no como pregunta.
- Antes de dar el requirements por terminado, valida: sin detalles de implementación, cada RF
  testeable, criterios de éxito medibles, historias independientes, casos borde/supuestos cubiertos.

### Paso 2 — brownfield-impact.md
Archivos/módulos afectados (tabla con riesgo por archivo), contratos tocados (rutas de Expo Router,
forma de datos en SQLite, stores consumidos por otras pantallas), riesgos de regresión concretos,
matriz de impacto (UI, stores, SQLite, build Android, CI).

### Paso 3 — design.md
Arquitectura dentro de las capas de la app (qué pantalla/componente/store/tabla se agrega o modifica),
decisiones técnicas con alternativas descartadas y por qué, trade-offs en tabla.

### Paso 4 — tasks.md
Desglose en tareas pequeñas y verificables, con dependencias y una línea final con el grafo
(`T1 → T2 → (T3, T4) → T5`).

### Paso 5 — test-plan.md
Una fila por requisito funcional (`RF-XXX` → caso de prueba → cómo se valida), plan de regresión
manual si toca UI/build, criterios de "hecho" en checklist.

### Paso 6 — Guardar y validar con el usuario
Guarda todo en `specs/<slug-feature>/` (kebab-case, sin prefijo numérico). Declara supuestos y vacíos
de información explícitamente. **No implementes código todavía.** Si quedaron
`[NEEDS CLARIFICATION]`, preséntalas en tabla de opciones (A/B/C + otra) antes de dar el spec por
completo. Al terminar, sugiere `/sdd-clarify` (si hay ambigüedades) o `/sdd-build` (si no).
