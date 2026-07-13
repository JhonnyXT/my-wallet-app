---
description: Inicia un flujo Spec-Driven Development (SDD) para una feature o cambio
argument-hint: <objetivo de la feature>
---

Entra en **SDD_MODE**. Objetivo: $ARGUMENTS

Este proyecto es frontend puro (React Native + Expo, sin backend) — no apliques Clean/Hexagonal
Architecture de servidor. Organiza el diseño por capas de la app: pantalla (Expo Router) → store
(Zustand) → acceso a datos (SQLite/AsyncStorage) → componentes UI, siguiendo la estructura y
convenciones ya documentadas en `AGENTS.md` y `.cursor/rules/*.mdc`.

Produce los artefactos de spec de forma completa y trazable, sin recortar por ahorro de tokens:

1. **requirements.md** — objetivo, alcance (qué incluye / qué excluye explícitamente), historias de
   usuario **priorizadas e independientemente probables** (P1, P2, P3 — cada una debe seguir teniendo
   valor por sí sola si es la única que se implementa), casos de uso, requisitos funcionales
   numerados y testeables, criterios de éxito **medibles y agnósticos de implementación** (no
   "responde en 200ms", sí "el usuario ve el resultado al instante"), casos borde, supuestos.

   - Si hay ambigüedades reales de alcance: usa como máximo 3 marcadores `[NEEDS CLARIFICATION: pregunta específica]`,
     priorizando por impacto (alcance > seguridad/privacidad > experiencia de usuario > detalle técnico).
     No preguntes lo que ya tiene un default razonable según las convenciones del proyecto — documenta
     esos defaults en "Supuestos" en vez de preguntar.
   - Antes de dar el spec por terminado, valida contra un checklist rápido y corrígelo si falla algo:
     - [ ] Sin detalles de implementación en requirements.md (eso va en design.md)
     - [ ] Cada requisito funcional es testeable sin ambigüedad
     - [ ] Los criterios de éxito son medibles y no mencionan frameworks/librerías
     - [ ] Cada historia de usuario es probable de forma independiente
     - [ ] Casos borde y supuestos identificados

2. **brownfield-impact.md** — archivos/módulos afectados (tabla con riesgo por archivo), contratos
   tocados (rutas de Expo Router, forma de datos en SQLite, stores consumidos por otras pantallas),
   riesgos de regresión concretos (no genéricos), matriz de impacto por área (UI, stores, SQLite,
   build Android, CI).

3. **design.md** — arquitectura propuesta dentro de las capas de la app (qué pantalla/componente/store/
   tabla se agrega o modifica), decisiones técnicas con alternativas descartadas y por qué, trade-offs
   explícitos en tabla.

4. **tasks.md** — desglose en tareas pequeñas y verificables, con dependencias y orden de ejecución
   (usa una línea final con el grafo de dependencias, ej. `T1 → T2 → (T3, T4) → T5`).

5. **test-plan.md** — estrategia QA, una fila por requisito funcional (`RF-XXX` → caso de prueba →
   cómo se valida), plan de regresión manual si toca UI/build, criterios de "hecho" en checklist.

Guarda los artefactos en `specs/<slug-feature>/` (slug en kebab-case, sin prefijo numérico — sigue la
convención de este proyecto). Declara supuestos y marca vacíos de información explícitamente en vez de
inventar. Mantén la trazabilidad requisito → decisión → archivo → prueba.

**No implementes código todavía**: primero valida el spec con el usuario. Si detectaste
`[NEEDS CLARIFICATION]`, preséntalas antes de dar el spec por completo — máximo 3, con formato de
tabla de opciones sugeridas (A/B/C + "otra") para que el usuario responda rápido en vez de tener que
redactar la respuesta desde cero.

Al terminar, sugiere si conviene correr `/sdd-clarify` (si quedaron ambigüedades) o pasar directo a
`/sdd-build`.
