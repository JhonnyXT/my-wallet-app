---
name: add-screen
description: |
  Crea una nueva pantalla (screen) en MyWallet siguiendo el patrón de Expo Router
  con presentación fullScreenModal, tema dinámico, y arquitectura Feature-Sliced.
  Usar cuando el usuario pida "nueva pantalla", "nuevo modal", "nueva vista",
  "agregar página" o "crear screen". Basado en patrones reales de active-expense.tsx,
  voice-input.tsx y notification-review.tsx.
license: MIT
metadata:
  project: my-wallet-app
  stack: react-native-expo
---

## When to Use
- El usuario pide crear una nueva pantalla, vista o modal.
- Se necesita una nueva ruta en la app.
- Se va a implementar un feature que requiere interfaz propia.

## Gotchas
- Todas las pantallas se registran en `app/_layout.tsx`, NO en `app/(tabs)/_layout.tsx` — las tabs solo tienen `index`, `chat` y `wallet`.
- `presentation: "fullScreenModal"` es el estándar para pantallas fuera de tabs — NO usar `"modal"` a secas.
- Los textos de UI van en español, los nombres de variables/funciones en inglés.
- El `buildStyles` se llama `buildStyles`, `createStyles` o `s` según la pantalla — mantener consistencia dentro de la pantalla.
- NUNCA hardcodear colores excepto `#135BEC` para botones primarios, `#EF4444` para rojo y `#22C55E` para verde.

## Instructions

### Paso 1 — Crear el archivo de pantalla

Crear `app/{nombre-pantalla}.tsx` con esta estructura real del proyecto:

```tsx
import { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

const BLUE = "#135BEC";

export default function NombrePantallaScreen() {
  const theme = useTheme();
  const st = useMemo(() => buildStyles(theme), [theme]);
  const { top } = useSafeAreaInsets();

  return (
    <View style={[st.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={st.title}>Título en Español</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Contenido */}
      <View style={st.body}>
        {/* TODO: implementar */}
      </View>
    </View>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: t.text,
    },
    body: {
      flex: 1,
      paddingHorizontal: 24,
    },
  });
}
```

### Paso 2 — Registrar la ruta en _layout.tsx

Abrir `app/_layout.tsx` y agregar ANTES de `<Stack.Screen name="+not-found" />`:

```tsx
<Stack.Screen
  name="nombre-pantalla"
  options={{
    presentation: "fullScreenModal",
    animation: "slide_from_bottom",
    headerShown: false,
  }}
/>
```

### Paso 3 — Crear store si necesita estado propio

Si la pantalla necesita estado temporal (no persistido):

```typescript
// src/store/useNombreStore.ts
import { create } from "zustand";

interface NombreState {
  // Campos del estado
  reset: () => void;
}

export const useNombreStore = create<NombreState>((set) => ({
  // Valores iniciales
  reset: () => set({ /* valores iniciales */ }),
}));
```

### Paso 4 — Si necesita modificar la base de datos

Agregar migración en `src/db/db.ts` dentro de `initDatabase()`:

```typescript
try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN nueva_col TYPE NOT NULL DEFAULT 'valor'`); } catch {}
```

Y actualizar `TransactionRow` en el mismo archivo.

### Verificación
1. La pantalla usa `useTheme()` + `buildStyles()` + `useMemo`.
2. Registrada en `app/_layout.tsx` con `fullScreenModal`.
3. Textos visibles en español.
4. Sin colores hardcodeados (excepto constantes de acción).
5. Imports usan `@/` desde raíz.
