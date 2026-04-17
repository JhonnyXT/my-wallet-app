---
description: Prepara y crea un commit siguiendo las convenciones del proyecto MyWallet
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
Ejecutar mentalmente los puntos críticos del wallet-validator sobre los archivos cambiados:
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

Si hay algo desactualizado → actualizarlo **antes** de hacer el commit e incluirlo en el mismo commit.
Si todo está al día → continuar al siguiente paso.

### Paso 4 — Proponer mensaje de commit
Formato de mensaje:
```
tipo(scope): descripción breve en español

Detalles de los cambios realizados.
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`.
Scope: el área principal afectada (ui, db, store, voice, settings, notifications).

### Paso 5 — Ejecutar commit
Escribir el mensaje a un archivo temporal y commitear (PowerShell no soporta heredocs estilo bash):
```powershell
Set-Content -Path "commit-msg.txt" -Value "mensaje del commit"
git add -A
git commit -F commit-msg.txt
Remove-Item commit-msg.txt
```

### Paso 6 — Confirmar
```bash
git log --oneline -1
git status
```
NO hacer push automático — el usuario decide cuándo.
