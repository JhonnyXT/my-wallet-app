/**
 * Cliente de Firebase. Único punto de arranque de la red de la app (Regla inmutable #1): nada
 * fuera de `src/sync/` importa Firebase ni Google Sign-In (lo vigila `sync.boundary.test.ts`).
 *
 * Entornos (SYNC_ROADMAP.md, T10): `dev` usa el Firebase Emulator del computador (`npm run
 * emulators` + `adb reverse`, ver AGENTS.md); `test` y `prod`, sus proyectos reales, elegidos por
 * el `google-services.json` que `app.config.ts` asigna a cada variant.
 */
import Constants from "expo-constants";
import { connectAuthEmulator, getAuth } from "@react-native-firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "@react-native-firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { isDev } from "@/src/constants/appVariant";

// `localhost` llega al computador por `adb reverse` (teléfono físico). RNFirebase lo reescribiría
// a 10.0.2.2 (emulador de Android) si no fuera por `android_bypass_emulator_url_remap` en
// firebase.json.
const EMULATOR_HOST = "localhost";
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

let initialized = false;

/** Idempotente. Llamarla antes de cualquier uso de Auth/Firestore/Google Sign-In. */
export function ensureFirebase(): void {
  if (initialized) return;
  initialized = true;
  if (isDev) {
    connectAuthEmulator(getAuth(), `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
    connectFirestoreEmulator(getFirestore(), EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  }
  GoogleSignin.configure({
    // Lo inyecta app.config.ts desde google-services.json (cliente OAuth web).
    webClientId: Constants.expoConfig?.extra?.googleWebClientId as string | undefined,
  });
}
