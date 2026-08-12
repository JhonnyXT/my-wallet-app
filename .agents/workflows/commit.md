# /commit — Commit Inteligente

## Instrucciones

### Paso 1 — Verificar estado
```bash
git status
git diff --stat
```
Mostrar archivos modificados al usuario.

### Paso 2 — Validación rápida
Ejecutar mentalmente (o invocar la skill `wallet-validator`) los puntos críticos sobre los archivos cambiados:
- Sin `toLocaleString()` para moneda
- Fechas con `localISOString()`
- Sin llamadas a APIs externas
- Imports con `@/`

### Paso 3 — Revisar documentación
Leer los archivos de documentación del proyecto y verificar si alguno describe lo que cambió:
- `AGENTS.md` — arquitectura, stores, gotchas, deuda técnica
- `CONTEXT.md` — interfaces, flujos, descripción de pantallas
- `DOCUMENTATION.md` — comportamiento UI, interacciones
- `PRODUCT_REQUIREMENTS.md` — requisitos de features

Para cada archivo modificado en el diff, preguntarse:
- ¿Hay alguna interfaz, tipo o campo documentado que ya no existe o cambió de nombre?
- ¿Hay alguna descripción de flujo o pantalla que ya no sea precisa?
- ¿Hay algún "gotcha" o nota técnica que deba actualizarse?

Si hay algo desactualizado → actualizarlo **antes** de hacer el commit e incluirlo en el mismo commit (o invocar el subagente `generador-docs`).
Si todo está al día → continuar al siguiente paso.

**`CLAUDE.md` casi nunca se edita directo** — es un router delgado que importa `AGENTS.md`
completo (`@AGENTS.md`) más una tabla que apunta a `.cursor/rules/*.mdc` según el área tocada
(compartidas con Cursor, es el "contexto" que ese editor carga). Actualizar `AGENTS.md` ya
actualiza lo que `CLAUDE.md` expone. Lo que sí hay que revisar aparte, porque `/commit` no lo
toca en el paso de arriba, es si el diff **establece o cambia una convención** (no solo un hecho
puntual del proyecto) que debería vivir en la regla de área correspondiente:
- `.cursor/rules/database.mdc` — si se tocó `src/db/**` (esquema, migraciones, queries)
- `.cursor/rules/ui-components.mdc` — si se tocó cualquier `**/*.tsx` (tema, tokens, animaciones,
  gestos) y el patrón usado es nuevo o reemplaza uno documentado (ej. un componente base nuevo
  como `PressableScale`/`BottomSheet`, un cambio de convención de motion)
- `.cursor/rules/typescript-strict.mdc` — patrones de store o TypeScript strict nuevos
- `.cursor/rules/project-conventions.mdc` — convenciones generales nuevas

Un hecho puntual ("se agregó X pantalla") va en `AGENTS.md`; una convención reutilizable ("los
botones interactivos usan `PressableScale`, no `TouchableOpacity` plano") va en la regla de área.
Si no hay convención nueva, no hace falta tocar estos archivos.

### Paso 4 — Proponer mensaje de commit
Formato observado en el historial real del proyecto (`git log --oneline`):
```
tipo(scope): descripción breve en español, sin tildes si el resto del historial tampoco las usa
```
Tipos usados en este repo: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`.
Scope: el área principal afectada (ui, db, store, voice, settings, notifications, dashboard, agents...).

Confirmar el mensaje propuesto con el usuario antes de commitear.

### Paso 5 — Ejecutar commit

**Nunca crear archivos temporales** para el mensaje: `commit-msg.txt` fue un residuo del flujo
antiguo en PowerShell que quedaba tracked por error (ya está en `.gitignore`, pero tampoco debe
generarse).

En bash, heredoc:
```bash
git add -A
git commit -m "$(cat <<'EOF'
tipo(scope): mensaje del commit

Detalles de los cambios realizados si aplica.
EOF
)"
```

En PowerShell (no soporta heredocs), un `-m` por párrafo — equivalente y sin archivo temporal:
```powershell
git add -A
git commit -m "tipo(scope): mensaje del commit" -m "Detalles de los cambios realizados si aplica."
```

### Paso 6 — Confirmar
```bash
git log --oneline -1
git status
```
NO hacer push automático — el usuario decide cuándo (`git push origin master`, o la rama que corresponda).
