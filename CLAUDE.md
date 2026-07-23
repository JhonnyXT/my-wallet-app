# CLAUDE.md — MyWallet

Punto de entrada que Claude Code carga automáticamente. La guía del proyecto vive en `AGENTS.md`
(compartida con Cursor y cualquier herramienta compatible con el estándar AGENTS.md) — se importa
completa a continuación.

@AGENTS.md

## Reglas detalladas por área (leer bajo demanda)

Claude Code no soporta activación automática por `globs` como Cursor. Cuando trabajes en estas
áreas, lee la regla correspondiente:

| Si vas a tocar... | Lee |
|---|---|
| `src/db/**` (SQLite, migraciones, esquema) | `.cursor/rules/database.mdc` |
| Cualquier `**/*.tsx` (tema, tokens, animaciones, gestos) | `.cursor/rules/ui-components.mdc` |
| Cualquier `**/*.ts`/`**/*.tsx` (TypeScript strict, patrones de store) | `.cursor/rules/typescript-strict.mdc` |
| Convenciones generales (detalle sobre lo ya resumido en `AGENTS.md`) | `.cursor/rules/project-conventions.mdc` |

## Reglas de git de este repo

- No hay convención de ramas de equipo (el historial vive directo en `master`); no inventes
  nomenclatura de branches.
- Conventional commits en español: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf` +
  scope libre.
- Nunca `git push` ni crear PR sin autorización explícita del usuario.
- No usar `--no-verify` (aunque hoy no hay hooks configurados).

---

Los slash commands, subagentes y skills de este repo los descubre Claude Code automáticamente de
`.claude/commands/`, `.claude/agents/` y `.claude/skills/` — no hace falta enumerarlos aquí. Su
lógica es compartida con Cursor y vive en `.agents/`; la documentación del sistema está en
[`.agents/README.md`](.agents/README.md).
