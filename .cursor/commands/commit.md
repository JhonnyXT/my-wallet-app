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

### Paso 3 — Proponer mensaje de commit
Formato de mensaje:
```
tipo(scope): descripción breve en español

Detalles de los cambios realizados.
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`.
Scope: el área principal afectada (ui, db, store, voice, settings, notifications).

### Paso 4 — Ejecutar commit
Escribir el mensaje a un archivo temporal y commitear (PowerShell no soporta heredocs estilo bash):
```powershell
Set-Content -Path "commit-msg.txt" -Value "mensaje del commit"
git add -A
git commit -F commit-msg.txt
Remove-Item commit-msg.txt
```

### Paso 5 — Confirmar
```bash
git log --oneline -1
git status
```
NO hacer push automático — el usuario decide cuándo.
