---
description: Crea el scaffold de un nuevo módulo siguiendo la arquitectura Feature-Sliced de MyWallet
---

# /new-feature — Scaffold de Nuevo Módulo

## Instrucciones

Al recibir el nombre y descripción del feature, genera los archivos necesarios según esta estructura:

### 1. Determinar Tipo de Feature

Preguntar al usuario:
- **Nombre del feature** (ej: "recurring-expenses", "export-pdf")
- **¿Necesita pantalla nueva?** → archivo en `app/`
- **¿Necesita componente UI?** → archivo en `src/components/ui/`
- **¿Necesita store propio?** → archivo en `src/store/`
- **¿Necesita modificar DB?** → migración en `src/db/db.ts`
- **¿Necesita lógica de dominio?** → archivo en `src/features/`

### 2. Generar Archivos

Para cada archivo, usar las plantillas base:

#### Pantalla (`app/{feature-name}.tsx`)
```typescript
import { View, StyleSheet } from "react-native";
import { useMemo } from "react";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

export default function FeatureNameScreen() {
  const theme = useTheme();
  const st = useMemo(() => buildStyles(theme), [theme]);

  return <View style={st.container}>{/* TODO */}</View>;
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, padding: 24 },
  });
}
```

#### Componente UI (`src/components/ui/{FeatureName}.tsx`)
```typescript
import { View, Text, StyleSheet } from "react-native";
import { useMemo } from "react";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

interface FeatureNameProps {
  // Props tipadas
}

export function FeatureName({}: FeatureNameProps) {
  const theme = useTheme();
  const st = useMemo(() => buildStyles(theme), [theme]);

  return <View style={st.container}>{/* TODO */}</View>;
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {},
  });
}
```

#### Store (`src/store/use{FeatureName}Store.ts`)
```typescript
import { create } from "zustand";

interface FeatureNameState {
  // Estado
}

interface FeatureNameActions {
  // Acciones
}

export const useFeatureNameStore = create<FeatureNameState & FeatureNameActions>()((set, get) => ({
  // Implementación
}));
```

### 3. Registrar en Stack (si aplica)

Si el feature es un modal, agregar en `app/_layout.tsx`:
```tsx
<Stack.Screen name="{feature-name}" options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
```

### 4. Migración DB (si aplica)

Agregar en `initDatabase()` de `src/db/db.ts`:
```typescript
try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN new_col TYPE NOT NULL DEFAULT 'value'`); } catch {}
```
Y actualizar la interface `TransactionRow`.

### 5. Validar

Tras generar los archivos, ejecutar mentalmente el checklist de `wallet-validator`:
- Tema dinámico con `useTheme()`
- UI en español
- Sin colores hardcodeados
- Imports con `@/`
- Tipos TypeScript correctos
