import { useCallback, useState } from "react";
import { Switch } from "react-native";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { Fingerprint } from "lucide-react-native";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ListRow } from "@/src/components/ui/ListRow";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";

const BIOMETRIC_COLOR = "#4F46E5";

/**
 * Fila "Bloqueo con huella" (SISTEMA). Activar y desactivar piden autenticarse, para que
 * nadie con el teléfono desbloqueado pueda quitar el bloqueo. La capa que bloquea la app
 * vive en `src/components/ui/BiometricLockGate.tsx`, montada en `app/_layout.tsx`.
 */
export function BiometricLockRow() {
  const tokens = useAppTokens();
  const enabled = useSettingsStore((s) => s.biometricLockEnabled);
  const setEnabled = useSettingsStore((s) => s.setBiometricLockEnabled);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const handleToggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const activating = !enabled;
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (activating && level === LocalAuthentication.SecurityLevel.NONE) {
        setUnavailable(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: activating
          ? "Confirma tu identidad para activar el bloqueo"
          : "Confirma tu identidad para desactivarlo",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setEnabled(activating);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, enabled, setEnabled]);

  return (
    <>
      <ListRow
        label="Bloqueo con huella"
        icon={<Fingerprint size={16} color="#FFFFFF" strokeWidth={2} />}
        iconBg={BIOMETRIC_COLOR}
        onPress={handleToggle}
        right={
          <Switch
            value={enabled}
            disabled={busy}
            onValueChange={handleToggle}
            trackColor={{ true: "#135BEC", false: tokens.colors.border.default }}
            thumbColor={enabled ? "#fff" : tokens.colors.text.secondary}
          />
        }
      />
      <ConfirmDialog
        visible={unavailable}
        variant="info"
        title="No disponible"
        message="Configura una huella, tu rostro o un PIN en los ajustes del teléfono para usar el bloqueo."
        confirmLabel="Entendido"
        onConfirm={() => setUnavailable(false)}
        onCancel={() => setUnavailable(false)}
      />
    </>
  );
}
