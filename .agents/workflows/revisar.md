# /revisar — Revisión Técnica Completa

## Instrucciones

### Paso 1 — Ejecutar checklist wallet-validator
Activar la skill `wallet-validator` (`.agents/skills/wallet-validator/SKILL.md`) y recorrer los 12 puntos de validación sobre los archivos modificados recientemente.

### Paso 2 — Buscar violaciones automáticas
```bash
rg "toLocaleString" --type ts
rg "toISOString|toJSON" src/db/
rg "fetch\(|axios|http://|https://" src/ app/ --type ts
rg "color:\s*[\"']#" app/ src/components/ --type ts
rg ": any|as any" src/ app/ --type ts
```

### Paso 3 — Verificar tipos TypeScript
```bash
npx tsc --noEmit
```
Reportar cualquier error de tipo.

### Paso 4 — Verificar deuda técnica
Comprobar contra la lista de deuda técnica documentada en `AGENTS.md` — no repetir como hallazgo nuevo algo ya conocido y aceptado.

### Paso 5 — Generar reporte
```
Validación MyWallet — [fecha]
Resultado: X/12 checks
[Detalle de cada punto]
[Sugerencias de corrección]
```
