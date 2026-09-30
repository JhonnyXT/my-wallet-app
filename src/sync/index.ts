// API pública de la capa de sync. Pantallas y hooks importan de aquí, nunca de Firebase.
export { signInWithGoogle, signOut, deleteAccount, type SessionUser } from "./session";
export { useSession } from "./useSession";
export { AuthError, authErrorMessage, classifyAuthError, type AuthErrorKind } from "./errors";
