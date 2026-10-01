/**
 * Ajustes → CUENTA (SYNC_ROADMAP.md, Fases 2–3). Iniciar sesión es opcional (T7): sin cuenta la
 * app funciona igual. Muestra el estado del respaldo, cerrar sesión con "Mantener / Borrar de este
 * teléfono" (T9), qué hacer si los datos del teléfono son de otra cuenta (RF-13) y "Eliminar
 * cuenta" (obligatorio en Google Play).
 */
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, UserRound, UserX } from "lucide-react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Card, Divider } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ListRow } from "@/src/components/ui/ListRow";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { SheetHeader, useSheetPadding } from "@/src/components/ui/SheetParts";
import {
  authErrorMessage,
  classifyAuthError,
  deleteAccountAndCloudData,
  pendingChanges,
  resolveAccountConflict,
  signInWithGoogle,
  signOutWith,
  syncNow,
  useSession,
  useSyncStatus,
  type SyncPhase,
} from "@/src/sync";

const ACCENT = "#135BEC";
const DANGER = "#DC2626";

type Dialog = "signOut" | "delete" | "conflict" | null;

/** "hace un momento", "hace 5 min", "hace 2 h" o la fecha. */
function timeAgo(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = new Date(ts);
  return `el ${d.getDate()}/${d.getMonth() + 1}`;
}

function statusLabel(phase: SyncPhase, pending: number, lastSyncAt: number | null): string {
  if (phase === "syncing") return "Respaldando…";
  if (phase === "needs-decision") return "Elige qué hacer con los datos de este teléfono";
  if (pending > 0) {
    const n = pending === 1 ? "1 cambio pendiente" : `${pending} cambios pendientes`;
    return phase === "offline" ? `${n} (sin conexión)` : n;
  }
  if (phase === "offline") return "Sin conexión";
  if (phase === "error") return "No se pudo respaldar. Toca para reintentar";
  return lastSyncAt ? `Respaldado ${timeAgo(lastSyncAt, Date.now())}` : "Respaldando…";
}

/** Hoja con opciones apiladas (cerrar sesión, datos de otra cuenta). */
function ChoiceSheet({
  visible,
  title,
  subtitle,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  options: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }[];
  onClose: () => void;
}) {
  const tokens = useAppTokens();
  const padding = useSheetPadding();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={padding}>
        <SheetHeader title={title} subtitle={subtitle} />
        <View style={{ gap: 10, marginTop: 20 }}>
          {options.map((o) => (
            <PressableScale
              key={o.label}
              onPress={o.onPress}
              disabled={o.disabled}
              style={{
                height: 50,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: o.danger ? DANGER : ACCENT,
                opacity: o.disabled ? 0.4 : 1,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>{o.label}</Text>
            </PressableScale>
          ))}
          <PressableScale
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={{
              height: 50,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tokens.colors.surface.secondary,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: tokens.colors.text.primary }}>
              Cancelar
            </Text>
          </PressableScale>
        </View>
      </View>
    </BottomSheet>
  );
}

export function AccountSection() {
  const tokens = useAppTokens();
  const { user } = useSession();
  const { phase, pending, lastSyncAt } = useSyncStatus();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictPending, setConflictPending] = useState(0);

  // Datos de otra cuenta en el teléfono: se pregunta antes de unir (RF-13).
  useEffect(() => {
    if (phase !== "needs-decision") return;
    pendingChanges().then(setConflictPending);
    setDialog("conflict");
  }, [phase]);

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

  function goToOnboarding() {
    // Sin pantallas encima (la raíz llegó con replace), dismissAll avisa POP_TO_TOP.
    if (router.canDismiss()) router.dismissAll();
    router.replace("/login-onboarding");
  }

  async function signOut(mode: "keep" | "wipe") {
    setDialog(null);
    await run(async () => {
      const { blockedPending } = await signOutWith(mode);
      if (blockedPending > 0) {
        setError(
          blockedPending === 1
            ? "Hay 1 cambio sin respaldar. Conéctate para subirlo antes de borrar."
            : `Hay ${blockedPending} cambios sin respaldar. Conéctate para subirlos antes de borrar.`,
        );
        return;
      }
      if (mode === "wipe") goToOnboarding();
    });
  }

  const inset = tokens.spacing.md * 2 + 34;
  const offline = phase === "offline" || phase === "error";

  return (
    <>
      <Card padded={false}>
        {user ? (
          <>
            <ListRow
              label={user.email ?? user.name ?? "Cuenta de Google"}
              icon={<UserRound size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={ACCENT}
            />
            <Divider inset={inset} />
            <ListRow
              label={statusLabel(phase, pending, lastSyncAt)}
              icon={
                phase === "syncing" ? (
                  <RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />
                ) : offline ? (
                  <CloudOff size={16} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Cloud size={16} color="#FFFFFF" strokeWidth={2} />
                )
              }
              iconBg={
                offline || pending > 0 || phase === "needs-decision"
                  ? "#D97706"
                  : tokens.colors.state.success
              }
              onPress={
                phase === "needs-decision"
                  ? () => setDialog("conflict")
                  : phase === "syncing"
                    ? undefined
                    : () => void syncNow()
              }
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
            iconBg={ACCENT}
            showChevron
            onPress={() => run(signInWithGoogle)}
          />
        )}
      </Card>

      <ChoiceSheet
        visible={dialog === "signOut"}
        title="Cerrar sesión"
        subtitle="Tu información sigue guardada en tu cuenta. ¿Qué hacemos con la de este teléfono?"
        options={[
          { label: "Mantener en este teléfono", onPress: () => void signOut("keep") },
          { label: "Borrar de este teléfono", danger: true, onPress: () => void signOut("wipe") },
        ]}
        onClose={() => setDialog(null)}
      />

      <ChoiceSheet
        visible={dialog === "conflict"}
        title="Este teléfono tiene datos de otra cuenta"
        subtitle={
          conflictPending > 0
            ? `Tiene ${conflictPending} cambios que no alcanzaron a respaldarse en la otra cuenta: para no perderlos, únelos con esta o cierra sesión.`
            : "Puedes unirlos con esta cuenta, o borrarlos del teléfono y usar solo los de esta cuenta (los de la otra siguen guardados en ella)."
        }
        options={[
          {
            label: "Unir con esta cuenta",
            onPress: () => {
              setDialog(null);
              void run(() => resolveAccountConflict("merge"));
            },
          },
          {
            label: "Borrar del teléfono y usar esta",
            danger: true,
            disabled: conflictPending > 0,
            onPress: () => {
              setDialog(null);
              void run(() => resolveAccountConflict("replace"));
            },
          },
        ]}
        onClose={() => setDialog(null)}
      />

      <ConfirmDialog
        visible={dialog === "delete"}
        variant="danger"
        title="¿Eliminar tu cuenta?"
        message="Se borra tu cuenta de MyWallet y todo lo que tengas guardado en la nube. No se puede deshacer. Tus datos en este teléfono no se tocan."
        confirmLabel="Eliminar cuenta"
        onConfirm={() => {
          setDialog(null);
          run(deleteAccountAndCloudData);
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
