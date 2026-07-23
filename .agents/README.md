# Sistema de agentes IA — MyWallet

Documentación del *tooling* de IA del repositorio: cómo activarlo, qué piezas lo componen y
dónde vive cada una. **No se auto-carga en contexto** — léelo cuando vayas a tocar el sistema
de agentes (agregar un comando, una skill, un subagente) o al hacer onboarding.

Para las reglas del *código* de la app (stack, convenciones, reglas inmutables, gotchas), la
referencia es [`../AGENTS.md`](../AGENTS.md), que sí se carga automáticamente.

---

## Onboarding del sistema de agentes IA

Este repositorio incluye un **sistema completo de agentes de IA** (compatible con Cursor, Claude Code y otros). Cualquier colaborador que clone el proyecto puede activar todo el contexto, las skills y los comandos personalizados con dos pasos:

### 1. Skills públicas — restaurar desde `skills-lock.json`

Las skills custom del proyecto están versionadas dentro de `.agents/skills/`. Las skills **públicas** (de terceros) no se versionan; se reinstalan desde el lockfile que sí está versionado:

```bash
npx skills install
```

Esto lee `skills-lock.json` (raíz del proyecto) y descarga las 11 skills públicas:
`systematic-debugging`, `react-native`, `expo-react-native-typescript`, `expo-react-native-performance`, `finishing-a-development-branch`, `test-driven-development`, `apple-design`, `verification-before-completion`, `writing-skills`, `react-native-best-practices`, `upgrading-react-native`.

> Si tu CLI no soporta `install` desde lockfile, usa `npx skills add <fuente>/<skill>` para cada entry de `skills-lock.json`.

### 2. Cursor IDE — detección automática

Cursor detecta automáticamente al abrir el repositorio:
- `.cursor/rules/*.mdc` — se cargan según los `globs` de cada regla.
- `.cursor/commands/*.md` — se invocan escribiendo `/<nombre>` en el chat.
- `.cursor/agents/*.md` — disponibles como subagents (cuadro "Task" del agente).
- `AGENTS.md` — leído por el agente como guía maestra del repositorio.

No requiere configuración adicional. Solo asegúrate de tener Cursor actualizado.

### 2b. Claude Code — detección automática

Claude Code carga `CLAUDE.md` (raíz) automáticamente, que a su vez importa este mismo `AGENTS.md` completo. Además:
- `.claude/agents/*.md` — subagentes (`revisor-ui`, `auditor-deuda`, `generador-docs`), con `tools` explícitos.
- `.claude/commands/*.md` — slash commands, adaptados de `.cursor/commands/` (sin PowerShell, con rutas portables vía `$ANDROID_HOME`).
- `.agents/skills/*/SKILL.md` — las mismas skills que usa Cursor; Claude Code las lee del mismo lugar, no están duplicadas.

Las reglas `.cursor/rules/*.mdc` no se auto-cargan por `globs` en Claude Code (esa activación condicional es específica de Cursor) — se leen bajo demanda según la tabla en `CLAUDE.md`.

### 2c. Spec-Driven Development (`/sdd`)

Para features complejas que ameriten spec formal antes de implementar (no reemplaza el flujo directo
para cambios simples — ver criterios en la tabla de abajo). Implementado como slash commands propios
(mismo patrón que usa el monorepo `wms/` de la organización), no con la herramienta externa spec-kit:
sin CLI ni dependencia externa que mantener, un archivo `.md` por comando, versionado igual que el
resto de `.claude/commands/` y `.cursor/commands/`.

- `/sdd <objetivo>` — genera el spec completo en `specs/<slug-feature>/`: `requirements.md`,
  `brownfield-impact.md`, `design.md`, `tasks.md`, `test-plan.md`.
- `/sdd-clarify <feature>` — opcional, resuelve ambigüedades (`[NEEDS CLARIFICATION]`) antes de
  implementar. Tomado de la idea de `/speckit-clarify` de spec-kit.
- `/sdd-analyze <feature>` — opcional, revisa consistencia cruzada entre los 5 artefactos (requisitos
  sin tarea/prueba, impacto no declarado, violaciones a las Reglas inmutables) antes de implementar.
  Tomado de la idea de `/speckit-analyze` de spec-kit.
- `/sdd-build <feature>` — implementa desde el spec, tarea por tarea.
- `/sdd-test <feature>` — genera y ejecuta pruebas desde `test-plan.md`.

Flujo típico: `/sdd` → (`/sdd-clarify` si quedó algo ambiguo) → (`/sdd-analyze` si se quiere una
revisión de consistencia) → `/sdd-build` → `/sdd-test`.

**`specs/` está en `.gitignore`** (mismo criterio que `wms-inventarios-ms`): son documentos de trabajo
locales, no se suben al repo. Si se quiere compartir una spec puntual con otra persona/máquina, hay
que hacerlo por fuera de git (copiar el archivo, pegar en un canal, etc.) — no hay historial
compartido de specs vía git en este proyecto.

No hay un `constitution.md` separado: la gobernanza para SDD ya vive en las "Reglas inmutables" de
este archivo (sección más abajo) — los comandos `/sdd-*` la referencian directamente.

### 3. Comandos slash más usados

| Comando | Cuándo usarlo |
|---------|---------------|
| `/arrancar` | Build APK release + instala vía ADB (alias de `/build-apk`) |
| `/dev` | Build debug + hot reload (desarrollo iterativo) |
| `/build-apk` | Build APK release + instala vía ADB |
| `/revisar` | Validación pre-commit con `wallet-validator` |
| `/commit` | Commit inteligente con validación + actualización de docs |
| `/push` | Sincroniza los 4 documentos del proyecto contra el rango completo de commits a subir, antes de hacer `git push` |
| `/nuevo-componente` | Scaffold componente UI Stitch |
| `/nueva-pantalla` | Scaffold pantalla modal con registro |
| `/nuevo-feature` | Scaffold feature completo (pantalla + store + DB + componente) |
| `/sdd` | Genera spec formal (requirements/brownfield-impact/design/tasks/test-plan) para features grandes |
| `/sdd-build` | Implementa desde un spec ya generado |
| `/sdd-test` | Genera/ejecuta pruebas desde el test-plan de un spec |

### 4. Subagentes disponibles

Ver [Subagentes](#subagentes-agentsagents) en el mapa de abajo — la tabla completa está ahí para no
duplicarla.

### 5. Estructura del sistema (resumen)

```
.agents/                  → FUENTE ÚNICA, agnóstica de herramienta
  README.md               → este archivo
  workflows/              → 12 workflows = los 14 slash commands (arrancar y build-apk comparten uno)
  agents/                 → 3 subagentes (cuerpo de instrucciones)
  skills/                 → 4 skills custom (versionadas) + públicas (vía skills-lock.json)
  snippets/               → fragmentos reutilizados por los workflows (entorno-android.md)
.claude/
  commands/, agents/      → adaptadores: solo frontmatter + puntero a .agents/
  skills/                 → symlinks a .agents/skills (las 4 custom versionadas)
.cursor/
  commands/, agents/      → adaptadores: solo frontmatter + puntero a .agents/
  rules/                  → 4 reglas con globs (específicas de Cursor)
specs/                    → Specs por feature de /sdd — en .gitignore, no se versiona
AGENTS.md                 → Guía del código de la app (se auto-carga)
CONTEXT.md                → Contexto técnico exhaustivo (~1250 líneas)
DOCUMENTATION.md          → Manual de usuario final
PRODUCT_REQUIREMENTS.md   → Historias de usuario y requisitos
skills-lock.json          → Lockfile reproducible de skills públicas
```

> El detalle de cada pieza está en [Mapa de archivos de agentes](#mapa-de-archivos-de-agentes).
## Mapa de archivos de agentes

### Principio: una fuente, adaptadores por herramienta

La lógica de cada componente vive **una sola vez** en `.agents/`, y cada herramienta aporta solo su
frontmatter apuntando ahí. Antes había dos copias (`.claude/` y `.cursor/`) que se desincronizaron:
13 de 14 comandos habían divergido, algunos perdiendo contenido normativo. **No hay nada que
sincronizar a mano: editá el archivo de `.agents/` y ambas herramientas lo toman.**

| Qué | Fuente única | Adaptadores |
|---|---|---|
| Slash commands (14) | `.agents/workflows/*.md` (12 archivos) | `.claude/commands/*.md` + `.cursor/commands/*.md` |
| Subagentes (3) | `.agents/agents/*.md` | `.claude/agents/*.md` (con `tools:`) + `.cursor/agents/*.md` |
| Skills (4 custom + públicas) | `.agents/skills/*/SKILL.md` | symlinks en `.claude/skills/`; Cursor las lee directo |
| Fragmentos compartidos | `.agents/snippets/*.md` | — (los leen los workflows) |
| Reglas por área | `.cursor/rules/*.mdc` | auto por `globs` en Cursor; bajo demanda en Claude Code (tabla en `CLAUDE.md`) |

`/arrancar` y `/build-apk` comparten `workflows/build-apk.md` (son el mismo procedimiento; se
conservan ambos nombres por costumbre). Por eso hay 12 workflows para 14 comandos.

### Rules (`.cursor/rules/`)

| Archivo | Activación | Descripción |
|---------|-----------|-------------|
| `project-conventions.mdc` | `alwaysApply: true` | Arquitectura Feature-Sliced y restricciones que no están en `AGENTS.md` |
| `database.mdc` | `src/db/**` | Convenciones SQLite, WAL, fechas ISO, migraciones |
| `ui-components.mdc` | `**/*.tsx` | Stitch Design, tema dinámico, animaciones, checklist |
| `typescript-strict.mdc` | `**/*.ts, **/*.tsx` | TypeScript strict, patrones Zustand, exports, imports |

### Skills custom (`.agents/skills/`)

| Skill | Propósito |
|-------|----------|
| `add-screen` | Scaffold nueva pantalla Expo Router con tema y registro en `_layout` |
| `add-component` | Scaffold nuevo componente UI Stitch con dark mode |
| `debug-react-native` | Debugging por capas: SQLite → Zustand → Router → UI → Build → Notificaciones |
| `wallet-validator` | Validación pre-commit (12 checks); la invocan `/revisar`, `add-component`, `add-screen` y `debug-react-native` |

> Claude Code **solo descubre skills enlazadas en `.claude/skills/`**. Las 4 custom están
> versionadas ahí como symlinks; las públicas se ignoran en git y se regeneran con
> `npx skills install`. Si agregás una skill custom nueva, creá también su symlink y sumalo a las
> excepciones de `.gitignore`, o Claude Code no la verá.

### Subagentes (`.agents/agents/`)

| Agente | Modo | Cuándo invocarlo |
|--------|------|------------------|
| `revisor-ui` | Solo lectura (`Read, Grep, Glob`) | Antes de mergear UI: tema, accesibilidad, consistencia visual. Delega en la skill `apple-design` para HIG |
| `auditor-deuda` | Solo lectura (`Read, Grep, Glob`) | Periódicamente: código muerto, duplicaciones, deuda técnica |
| `generador-docs` | Lectura + escritura solo `.md` | Tras cambios estructurales: sincroniza `AGENTS.md`, `CONTEXT.md`, `DOCUMENTATION.md` y `PRODUCT_REQUIREMENTS.md` (los 4). No tiene `Bash`: por eso `/push` lo invoca y hace el git por él |

### Spec-Driven Development (`.agents/workflows/sdd*.md`, `specs/`)

| Comando | Qué hace |
|------|--------|
| `/sdd` | Genera el spec completo de una feature |
| `/sdd-clarify` | Resuelve ambigüedades antes de implementar (opcional) |
| `/sdd-analyze` | Consistencia cruzada entre artefactos antes de implementar (opcional) |
| `/sdd-build` | Implementa desde el spec |
| `/sdd-test` | Genera/ejecuta pruebas desde el test-plan |

`specs/<slug-feature>/` guarda los artefactos por feature (`requirements.md`,
`brownfield-impact.md`, `design.md`, `tasks.md`, `test-plan.md`) y está en `.gitignore` — no se
versiona.

Mismo patrón que `wms/wms-inventarios-ms` (comandos propios en vez de la herramienta externa
spec-kit), adaptado a frontend React Native/Expo. Se probó instalar
[spec-kit](https://github.com/github/spec-kit) primero, pero se descartó: dependía de un CLI externo
(`uv` + `specify-cli`) y usaba el mecanismo de Agent Skills de Claude Code, que no recarga en
caliente dentro de una sesión ya abierta — los comandos clásicos no tienen ese problema.

---

## Diseño de la landing con `ui-ux-pro-max` (metodología)

Cómo se usó la skill de diseño al construir `docs/index.html`, para no repetir el mismo proceso
de prueba y error si se vuelve a tocar el diseño. El contenido y el proceso de release de la
landing en sí están en `AGENTS.md`, sección "Landing page y GitHub Pages".

- La landing se diseñó con ayuda de la skill/plugin `ui-ux-pro-max`, instalada a nivel de usuario de Claude Code (no es parte de este repo ni de `.agents/skills/` — no requiere instalación local para clonar/editar el HTML).
- **Qué se tomó de `ui-ux-pro-max` y qué se descartó** (para no repetir el mismo proceso de prueba y error si se vuelve a tocar el diseño):
  - Se corrió `design_system.py "Personal Finance Tracker"` (script del plugin global, no vive en este repo — cacheado en `~/.claude/plugins/cache/ui-ux-pro-max-skill/`). Se usó el **patrón de layout** que devolvió ("Interactive Product Demo": Hero → Features → CTA) — es la estructura real de `docs/index.html`.
  - Se **descartó la paleta de color genérica** que devolvió el generador (`#1E40AF` azul + `#059669` verde sobre fondo `#0F172A`, estilo "Dark Mode OLED"). En su lugar se usaron los colores reales de MyWallet (`#135BEC` accent, `#22C55E` verde, `#EF4444` rojo), para que la landing se sienta como la app real y no como una plantilla genérica de fintech. Ojo: solo `#135BEC` es un token de `src/theme/index.ts` (`accent`); el verde y el rojo están hardcodeados en componentes (`CategoryChart.tsx`, `TransactionItem.tsx`) y no existen como tokens del tema.
  - Se **descartó la tipografía que devolvió el generador** (`Caveat` + `Quicksand`, pairing "handwritten/personal" — pensado para blogs personales, no encajaba con una app financiera). Se hizo una búsqueda separada por dominio (`search.py --domain typography "fintech professional trustworthy"`), que devolvió el pairing **"Financial Trust" (IBM Plex Sans)** — explícitamente recomendado para bancos/fintech — y ese sí se usó, en ambas páginas.
  - Se probaron otras 3 opciones de estilo (`search.py --domain style "fintech mobile app trust minimal"`: "Bitcoin DeFi", "SaaS Mobile High-Tech Boutique", "Modern Dark Cinema") solo como referencia — ninguna se adoptó tal cual, porque todas traían su propia paleta/efectos que hubieran competido con la identidad visual ya establecida de MyWallet.
  - Regla general aplicada: usar la skill para **estructura y validación** (¿el patrón de layout tiene sentido para este tipo de producto? ¿la tipografía es apropiada para la industria?), no para **la identidad visual final** — eso lo define la app real, no una paleta genérica por categoría de producto.
