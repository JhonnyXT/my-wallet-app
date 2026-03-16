---
name: wallet-validator
description: >-
  Valida la integridad técnica del proyecto MyWallet antes de commit o merge.
  Verifica convenciones de moneda COP, fechas ISO, tema dinámico, arquitectura
  Feature-Sliced y offline-first. Usar cuando se revisen cambios, se haga code
  review, o se prepare un commit.
---

# Wallet Validator — Validación Técnica MyWallet

## Cuándo Usar

- Antes de hacer commit de cambios significativos.
- Al revisar código nuevo o refactors.
- Cuando se pida verificar integridad del proyecto.

## Checklist de Validación

Copiar y completar este checklist tras cada revisión:

```
Validación MyWallet:
- [ ] 1. Moneda COP: sin toLocaleString(), formato con regex custom
- [ ] 2. Fechas: localISOString(), nunca toISOString()
- [ ] 3. Offline: sin fetch/axios/http/API calls
- [ ] 4. Categorías: consulta userCategories antes de mapas legacy
- [ ] 5. Tema: useTheme() + useMemo + buildStyles(), sin colores hardcodeados
- [ ] 6. Arquitectura: pantallas en app/, componentes en src/components/ui/
- [ ] 7. Tipos: TransactionRow actualizado si se modificó DB
- [ ] 8. Migraciones: ALTER TABLE con try/catch
- [ ] 9. UI español: textos visibles en español
- [ ] 10. Imports: usando @/ para paths desde la raíz
```

## Cómo Validar Cada Punto

### 1. Moneda COP
Buscar `toLocaleString` en archivos modificados. Si existe, reemplazar con:
```typescript
Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
```

### 2. Fechas ISO locales
Buscar `toISOString()` y `toJSON()` en `src/db/`. Debe usarse `localISOString()`.

### 3. Offline-first
Buscar `fetch(`, `axios`, `http://`, `https://` en archivos `.ts`/`.tsx` (excluyendo configs y docs). No debe haber llamadas de red en código de producción.

### 4. Categorías dinámicas
En funciones que resuelvan categorías, verificar que reciban `userCategories` como parámetro o lo lean del store antes de consultar `CATEGORY_MAP` / `EMOJI_TO_CATEGORY_NAME`.

### 5. Tema dinámico
En archivos `.tsx`, verificar que no haya colores hardcodeados en estilos (excepto `#135BEC` para botones primarios). Buscar patrones como `color: "#` o `backgroundColor: "#` fuera de `buildStyles`.

### 6. Arquitectura Feature-Sliced
| Tipo | Ubicación correcta |
|------|--------------------|
| Pantalla/ruta | `app/` |
| Componente UI | `src/components/ui/` |
| Store | `src/store/` |
| Utilidad pura | `src/utils/` |
| Lógica de dominio | `src/features/` |
| Constante | `src/constants/` |

### 7-8. DB y Migraciones
Si `src/db/db.ts` fue modificado, verificar que `TransactionRow` refleje el esquema y que nuevas columnas tengan migración con try/catch.

## Resultado

Al finalizar, reportar:
- Cantidad de puntos que pasan / total (ej: "9/10").
- Detalle de cualquier punto que no pase con sugerencia de fix.
