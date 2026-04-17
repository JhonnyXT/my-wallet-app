---
name: wallet-validator
description: |
  Valida la integridad técnica del proyecto MyWallet antes de commit o merge.
  Verifica convenciones de moneda COP, fechas ISO, tema dinámico, arquitectura
  Feature-Sliced, offline-first y TypeScript strict. Usar cuando se revisen
  cambios, se haga code review, se prepare un commit, o se pida "validar",
  "verificar" o "revisar el código".
license: MIT
metadata:
  project: my-wallet-app
  stack: react-native-expo
---

## When to Use
- Antes de hacer commit de cambios significativos.
- Al revisar código nuevo o refactors.
- Cuando el usuario pida "validar", "verificar" o "revisar".
- Después de implementar un feature nuevo.

## Gotchas
- `amount > 0` = gasto, `amount < 0` = ingreso — convención invertida.
- `#135BEC` para botones primarios es la ÚNICA excepción a "no hardcodear colores".
- `src/features/voice/useVoiceExpense.ts` está roto y no se usa — ignorar en validación.
- `ActionPills.tsx`, `CustomTabBar.tsx`, `AnimatedNumber.tsx` son huérfanos — no son errores.
- El `main` de `package.json` DEBE ser `"index.js"` (no `"expo-router/entry"`).

## Instructions

### Paso 1 — Ejecutar checklist de validación

Para cada archivo modificado, verificar:

```
Validación MyWallet:
- [ ] 1. Moneda COP: sin toLocaleString(), formato con regex custom
- [ ] 2. Fechas: localISOString(), nunca toISOString()
- [ ] 3. Offline: sin fetch/axios/http/API calls en código de producción
- [ ] 4. Categorías: consulta userCategories antes de mapas legacy
- [ ] 5. Tema: useTheme() + useMemo + buildStyles(), sin colores hardcodeados
- [ ] 6. Arquitectura: pantallas en app/, componentes en src/components/ui/
- [ ] 7. Tipos: TransactionRow actualizado si se modificó DB
- [ ] 8. Migraciones: ALTER TABLE con try/catch
- [ ] 9. UI español: textos visibles en español
- [ ] 10. Imports: usando @/ para paths desde la raíz
- [ ] 11. Named exports en componentes, default en pantallas
- [ ] 12. Sin `any` innecesarios (excepto Reanimated/SpeechModule)
```

### Paso 2 — Buscar violaciones específicas

```bash
# Moneda
rg "toLocaleString" --type ts --type tsx

# Fechas
rg "toISOString|toJSON" src/db/

# Offline
rg "fetch\(|axios|http://|https://" src/ app/ --type ts --type tsx

# Colores hardcodeados (fuera de buildStyles)
rg "color:\s*[\"']#" app/ src/components/ --type tsx

# Any innecesarios
rg ": any|as any" src/ app/ --type ts --type tsx
```

### Paso 3 — Verificar consistencia de stores

- ¿Cada nuevo store sigue el patrón `create<State>((set, get) => ({...}))`?
- ¿Se accede con selectores `useStore((s) => s.field)` en componentes?
- ¿Los servicios fuera de React usan `.getState()`?

### Paso 4 — Verificar navegación

- ¿Cada nueva pantalla está registrada en `app/_layout.tsx`?
- ¿El `name` del `Stack.Screen` coincide con el nombre del archivo?
- ¿Modales tienen `presentation: "fullScreenModal"`?

### Paso 5 — Reportar resultado

Formato de salida:

```
Validación MyWallet — [fecha]
Archivos revisados: [N]
Resultado: [X/12] checks pasados

✅ 1. Moneda COP — OK
❌ 5. Tema — Archivo X, línea Y: color "#FFF" hardcodeado fuera de buildStyles
...

Sugerencias:
- [Acción correctiva para cada fallo]
```

### Verificación
El reporte muestra la puntuación y las acciones correctivas necesarias.
