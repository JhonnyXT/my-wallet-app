# CLAUDE.md — MyWallet

Este archivo es el punto de entrada que Claude Code carga automáticamente. La guía maestra del proyecto vive en `AGENTS.md` (compartida con Cursor y cualquier otra herramienta compatible con el estándar AGENTS.md) — se importa completa a continuación.

@AGENTS.md

## Reglas detalladas por área (leer bajo demanda, no se auto-cargan)

Claude Code no soporta activación automática por `globs` como Cursor. Cuando trabajes en estas áreas, lee la regla correspondiente:

| Si vas a tocar... | Lee |
|---|---|
| `src/db/**` (SQLite, migraciones, esquema) | `.cursor/rules/database.mdc` |
| Cualquier `**/*.tsx` (tema, tokens, animaciones, gestos) | `.cursor/rules/ui-components.mdc` |
| Cualquier `**/*.ts`/`**/*.tsx` (TypeScript strict, patrones de store) | `.cursor/rules/typescript-strict.mdc` |
| Convenciones generales (ya resumidas en `AGENTS.md`, este es el detalle completo) | `.cursor/rules/project-conventions.mdc` |

## Skills (`.agents/skills/`)

Formato AgentSkills estándar, compartido con Cursor — no duplicado en `.claude/skills/`. Se auto-invocan según su `description` cuando el pedido del usuario coincide:

- `add-component` — nuevo componente UI
- `add-screen` — nueva pantalla/modal
- `debug-react-native` — debugging por capas (SQLite → Zustand → Router → UI → Build → HeadlessJS)
- `wallet-validator` — 12 checks de validación antes de commit

Skills públicas de terceros (restaurar con `npx skills install`, leen `skills-lock.json`): `systematic-debugging`, `react-native`, `expo-react-native-typescript`, `expo-react-native-performance`, `finishing-a-development-branch`, `test-driven-development`.

## Subagentes (`.claude/agents/`)

| Agente | Modo | Cuándo invocarlo |
|---|---|---|
| `revisor-ui` | Solo lectura (`Read, Grep, Glob`) | Antes de mergear UI: tema, accesibilidad, consistencia visual |
| `auditor-deuda` | Solo lectura (`Read, Grep, Glob`) | Periódicamente: código muerto, duplicaciones, deuda técnica |
| `generador-docs` | Lectura + escritura solo `.md` | Después de cambios estructurales: sincroniza AGENTS.md/CONTEXT.md/DOCUMENTATION.md/PRODUCT_REQUIREMENTS.md |

## Slash commands (`.claude/commands/`)

| Comando | Para qué |
|---|---|
| `/commit` | Commit guiado: valida convenciones, revisa docs desactualizadas, propone mensaje conventional commit. Nunca hace push. |
| `/push` | Sincroniza AGENTS.md/CONTEXT.md/DOCUMENTATION.md/PRODUCT_REQUIREMENTS.md contra el rango completo de commits a subir (vía `generador-docs`) y solo entonces hace `git push`. Última verificación antes de que el código sea definitivo — usar esto en vez de `git push` directo. |
| `/revisar` | wallet-validator + greps de violaciones + `tsc --noEmit` |
| `/nuevo-componente` | Scaffold componente UI Stitch |
| `/nueva-pantalla` | Scaffold pantalla modal con registro en `_layout.tsx` |
| `/nuevo-feature` | Scaffold módulo completo (pantalla + store + DB + componente) |
| `/dev` | Servidor Metro con hot reload |
| `/build-apk` | Build release + instalación por ADB |
| `/arrancar` | Build release + instalación por ADB (alias de `/build-apk`) |

## Reglas de git de este repo

- No hay convención de ramas de equipo (el historial vive directo en `master`); no inventes nomenclatura de branches — si en algún momento el equipo la define, actualizar esta sección y `.claude/commands/commit.md`.
- Conventional commits en español: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf` + scope libre.
- Nunca `git push` ni crear PR sin autorización explícita del usuario.
- No usar `--no-verify` (aunque hoy no hay hooks configurados).

## Nota de mantenimiento

Este `CLAUDE.md`, `.claude/agents/` y `.claude/commands/` fueron adaptados desde el sistema ya existente en `.cursor/` (rules/commands/agents) para que Claude Code tenga paridad de contexto sin duplicar contenido innecesariamente. Si el sistema de Cursor cambia, replicar el cambio aquí también — y viceversa.
