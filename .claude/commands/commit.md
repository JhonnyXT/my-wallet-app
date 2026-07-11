---
description: Prepara y crea un commit siguiendo las convenciones del proyecto MyWallet (conventional commits en español)
---

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

### Paso 4 — Proponer mensaje de commit
Formato observado en el historial real del proyecto (`git log --oneline`):
```
tipo(scope): descripción breve en español, sin tildes si el resto del historial tampoco las usa
```
Tipos usados en este repo: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`.
Scope: el área principal afectada (ui, db, store, voice, settings, notifications, dashboard, agents...).

Confirmar el mensaje propuesto con el usuario antes de commitear.

### Paso 5 — Ejecutar commit
Usar heredoc de bash directamente — **no crear archivos temporales** (`commit-msg.txt` fue un residuo del flujo anterior en PowerShell que quedaba tracked por error; evitarlo):
```bash
git add -A
git commit -m "$(cat <<'EOF'
tipo(scope): mensaje del commit

Detalles de los cambios realizados si aplica.
EOF
)"
```

### Paso 6 — Confirmar
```bash
git log --oneline -1
git status
```
NO hacer push automático — el usuario decide cuándo (`git push origin master`, o la rama que corresponda).
