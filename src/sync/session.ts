/**
 * Sesión con Google (SYNC_ROADMAP.md, T3/T7). Iniciar sesión es opcional: sin cuenta la app
 * funciona igual. Todas las funciones lanzan `AuthError` (ver `errors.ts`), nunca errores crudos
 * de Firebase/Google.
 */
import {
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
  type AuthCredential,
  type User,
} from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AuthError, classifyAuthError } from "./errors";
import { ensureFirebase } from "./firebase";

export interface SessionUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

export function toSessionUser(user: User): SessionUser {
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

function toAuthError(error: unknown): AuthError {
  return error instanceof AuthError ? error : new AuthError(classifyAuthError(error), error);
}

/** Abre el selector de cuentas de Google y devuelve la credencial para Firebase. */
async function googleCredential(): Promise<AuthCredential> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type === "cancelled") throw new AuthError("cancelled");
  // Sin idToken = falta el webClientId (Google no habilitado en Firebase al compilar).
  if (!result.data.idToken) throw new AuthError("unknown");
  return GoogleAuthProvider.credential(result.data.idToken);
}

export async function signInWithGoogle(): Promise<SessionUser> {
  ensureFirebase();
  try {
    const { user } = await signInWithCredential(getAuth(), await googleCredential());
    return toSessionUser(user);
  } catch (e) {
    throw toAuthError(e);
  }
}

/**
 * Cierra la sesión y deja todos los datos del teléfono (spec Fase 2, D-3): sin respaldo todavía,
 * ofrecer "borrar del teléfono" haría perder todo. La pregunta de T9 llega en la Fase 3.
 */
export async function signOut(): Promise<void> {
  ensureFirebase();
  try {
    await firebaseSignOut(getAuth());
    // Para que el próximo inicio muestre el selector de cuentas en vez de reusar la última.
    await GoogleSignin.signOut().catch(() => undefined);
  } catch (e) {
    throw toAuthError(e);
  }
}

/**
 * Elimina la cuenta de Firebase (Google Play exige ofrecerlo). Los datos del teléfono se quedan.
 * Si Firebase pide un inicio de sesión reciente, vuelve a abrir el selector de Google y reintenta.
 *
 * Fase 3: borrar `users/{uid}` en Firestore ANTES del usuario de Auth (las reglas exigen estar
 * autenticado). En la Fase 2 no hay nada guardado en la nube.
 */
export async function deleteAccount(): Promise<void> {
  ensureFirebase();
  const user = getAuth().currentUser;
  if (!user) return;
  try {
    try {
      await deleteUser(user);
    } catch (e) {
      if (classifyAuthError(e) !== "recent-login") throw e;
      await reauthenticateWithCredential(user, await googleCredential());
      await deleteUser(user);
    }
    await GoogleSignin.revokeAccess().catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
  } catch (e) {
    throw toAuthError(e);
  }
}
