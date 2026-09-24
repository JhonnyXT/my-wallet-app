#!/usr/bin/env bash
# Copia a la landing la lógica real de la app que usa la demo interactiva
# (parser de voz, búsqueda difusa y categorías predefinidas), para que la demo
# entienda las frases exactamente igual que la app. Correrlo cada vez que
# cambie alguno de esos archivos en `src/`:
#
#   cd landing && npm run sync:app
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/landing/src/demo/app"
mkdir -p "$DEST"

copy() {
  local src="$1" dst="$2"
  {
    printf '// COPIA GENERADA de %s por landing/scripts/sync-app-logic.sh.\n// No editar a mano: editar el original en la app y volver a correr el script.\n' "$src"
    sed \
      -e 's#import type { ActiveExpense, DateOption } from "@/src/store/useExpenseStore";#import type { ActiveExpense, DateOption } from "./types";#' \
      -e 's#from "@/src/utils/fuzzyMatch"#from "./fuzzyMatch"#' \
      -e 's#import("@/src/constants/categoryPresets")#import("./categoryPresets")#g' \
      "$ROOT/$src"
  } > "$DEST/$dst"
}

copy src/utils/voiceParser.ts voiceParser.ts
copy src/utils/fuzzyMatch.ts fuzzyMatch.ts
copy src/constants/categoryPresets.ts categoryPresets.ts

cat > "$DEST/types.ts" <<'EOF'
// Tipos de `src/store/useExpenseStore.ts` que necesita el parser copiado.
export type DateOption = "today" | "custom";
export type AccountType = "cash" | "savings" | "credit";
export interface ActiveExpense {
  amount: number;
  isExpense: boolean;
  categoryEmoji: string;
  categoryName: string;
  date: DateOption;
  customDate: Date | null;
  note: string;
  rawTranscript: string;
  account: AccountType;
  tags: string[];
}
EOF

if grep -rn '@/src/' "$DEST"; then
  echo "ERROR: quedaron imports de la app sin reescribir en $DEST" >&2
  exit 1
fi
echo "OK: lógica de la app copiada a $DEST"
