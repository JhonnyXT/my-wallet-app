#!/usr/bin/env bash
# Firebase Emulator Suite (Auth + Firestore) para el variant dev. Ver AGENTS.md → "Firebase por
# variant y emulador". firebase-tools exige Java 21+, pero Gradle usa el Java 17 del sistema: aquí
# se usa un JDK 21 aparte solo para el emulador (por defecto ~/.local/jdk-21, portátil, sin sudo).
set -euo pipefail

JAVA21_HOME="${JAVA21_HOME:-$HOME/.local/jdk-21}"
if [ ! -x "$JAVA21_HOME/bin/java" ]; then
  echo "No hay JDK 21 en $JAVA21_HOME (firebase-tools lo exige)." >&2
  echo "Instala Temurin 21 ahí, o exporta JAVA21_HOME con la ruta de otro JDK 21+." >&2
  exit 1
fi
export JAVA_HOME="$JAVA21_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

cd "$(dirname "$0")/.."
exec npx -y firebase-tools@15.32.0 emulators:start \
  --project mywallet-test-jb --import .firebase-emulator --export-on-exit
