/**
 * Ajustes → CUENTA (SYNC_ROADMAP.md, Fase 2). Iniciar sesión es opcional (T7): sin cuenta la app
 * funciona igual. Cerrar sesión deja todos los datos del teléfono (spec Fase 2, D-3). "Eliminar
 * cuenta" es obligatorio en Google Play.
 */
import { useState } from "react";
import { LogIn, LogOut, UserRound, UserX } from "lucide-react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { Card, Divider } from "@/src/components/ui/Card";
import { ListRow } from "@/src/components/ui/ListRow";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import {
  authErrorMessage,
  classifyAuthError,
  deleteAccount,
  signInWithGoogle,
  signOut,
  useSession,
} from "@/src/sync";

type Dialog = "signOut" | "delete" | null;

export function AccountSection() {
  const tokens = useAppTokens();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);

  // Nunca bloquea la app: solo evita un doble toque mientras la operación sigue en curso.
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(classifyAuthError(e)));
    } finally {
      setBusy(false);
    }
  }

  const inset = tokens.spacing.md * 2 + 34;

  return (
    <>
      <Card padded={false}>
        {user ? (
          <>
            <ListRow
              label={user.email ?? user.name ?? "Cuenta de Google"}
              icon={<UserRound size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#135BEC"
            />
            <Divider inset={inset} />
            <ListRow
              label={busy ? "Un momento…" : "Cerrar sesión"}
              icon={<LogOut size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              onPress={() => setDialog("signOut")}
            />
            <Divider inset={inset} />
            <ListRow
              label="Eliminar cuenta"
              icon={<UserX size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.danger}
              destructive
              onPress={() => setDialog("delete")}
            />
          </>
        ) : (
          <ListRow
            label={busy ? "Conectando…" : "Iniciar sesión con Google"}
            icon={<LogIn size={16} color="#FFFFFF" strokeWidth={2} />}
            iconBg="#135BEC"
            showChevron
            onPress={() => run(signInWithGoogle)}
          />
        )}
      </Card>

      <ConfirmDialog
        visible={dialog === "signOut"}
        variant="info"
        title="¿Cerrar sesión?"
        message="Tus datos se quedan en este teléfono. Puedes volver a iniciar sesión cuando quieras."
        confirmLabel="Cerrar sesión"
        onConfirm={() => {
          setDialog(null);
          run(signOut);
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        visible={dialog === "delete"}
        variant="danger"
        title="¿Eliminar tu cuenta?"
        message="Se borra tu cuenta de MyWallet y lo que tengas guardado en la nube. No se puede deshacer. Tus datos en este teléfono no se tocan."
        confirmLabel="Eliminar cuenta"
        onConfirm={() => {
          setDialog(null);
          run(deleteAccount);
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        visible={error !== null}
        variant="warning"
        title="No se pudo completar"
        message={error ?? ""}
        confirmLabel="Entendido"
        onConfirm={() => setError(null)}
        onCancel={() => setError(null)}
      />
    </>
  );
}
