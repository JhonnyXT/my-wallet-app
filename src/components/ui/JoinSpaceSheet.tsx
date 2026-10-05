/**
 * JoinSpaceSheet — unirse a una lista compartida con un código (Sync Fase 4, RF-03..07).
 * Paso 1: escribir el código. Paso 2 (solo si la lista tiene personas sin app): "¿Quién eres?",
 * para quedar ligado a ese nombre y a lo que ya pagó. Los errores se muestran aquí mismo.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { UserPlus } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { SheetHeader, SheetLabel, useSheetPadding } from "@/src/components/ui/SheetParts";
import type { ListMember } from "@/src/store/useSettingsStore";
import {
  completeJoin,
  INVITE_LENGTH,
  joinWithCode,
  SpaceError,
  spaceErrorMessage,
} from "@/src/sync";
import { useAppTokens } from "@/src/theme/tokens";

export interface JoinSpaceSheetProps {
  visible: boolean;
  /** Se unió: id de la lista nueva (quien abre la hoja la activa). */
  onJoined: (listId: string) => void;
  onClose: () => void;
}

const message = (e: unknown) => spaceErrorMessage(e instanceof SpaceError ? e.kind : "unknown");

export function JoinSpaceSheet({ visible, onJoined, onClose }: JoinSpaceSheetProps) {
  const tokens = useAppTokens();
  const c = tokens.colors;
  const padding = useSheetPadding();

  const [code, setCode] = useState("");
  const [choose, setChoose] = useState<{ spaceId: string; guests: ListMember[] } | null>(null);
  // Qué está esperando al servidor: "code", un id de persona, o "other".
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cada apertura empieza de cero.
  useEffect(() => {
    if (!visible) return;
    setCode("");
    setChoose(null);
    setBusy(null);
    setError(null);
  }, [visible]);

  const clean = code.replace(/[\s-]/g, "");
  const canJoin = clean.length === INVITE_LENGTH && busy === null;

  const submitCode = async () => {
    if (!canJoin) return;
    setBusy("code");
    setError(null);
    try {
      const result = await joinWithCode(code);
      if (result.status === "joined") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onJoined(result.listId);
      } else {
        setChoose({ spaceId: result.spaceId, guests: result.guests });
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  };

  const pick = async (guestId: string | null) => {
    if (!choose || busy) return;
    setBusy(guestId ?? "other");
    setError(null);
    try {
      const listId = await completeJoin(choose.spaceId, guestId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onJoined(listId);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  };

  const spinner = <ActivityIndicator size="small" color={c.text.secondary} />;

  return (
    <BottomSheet visible={visible} onClose={onClose} style={padding} avoidKeyboard>
      {!choose ? (
        <>
          <SheetHeader
            title="Unirme con un código"
            subtitle="Escribe el código que te mandaron para entrar a esa lista y registrar gastos ahí."
          />
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            onSubmitEditing={submitCode}
            placeholder="K7Q 2MX"
            placeholderTextColor={c.text.secondary}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={INVITE_LENGTH + 2}
            returnKeyType="go"
            style={[
              styles.codeInput,
              {
                color: c.text.primary,
                backgroundColor: c.surface.elevated,
                borderRadius: tokens.radius.md,
              },
            ]}
            accessibilityLabel="Código de invitación"
          />
          {!!error && <Text style={[styles.error, { color: c.state.danger }]}>{error}</Text>}
          <PressableScale
            onPress={submitCode}
            disabled={!canJoin}
            style={[styles.primaryBtn, { opacity: canJoin || busy ? 1 : 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Unirme"
            accessibilityState={{ disabled: !canJoin, busy: busy === "code" }}
          >
            {busy === "code" ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Unirme</Text>
            )}
          </PressableScale>
        </>
      ) : (
        <>
          <SheetHeader
            title="¿Quién eres?"
            subtitle="Si ya estabas en la lista con tu nombre, elígelo: lo que pagaste quedará como tuyo."
          />
          <SheetLabel first>En la lista</SheetLabel>
          {choose.guests.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => pick(g.id)}
              disabled={busy !== null}
              android_ripple={{ color: c.border.default }}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`Soy ${g.name}`}
            >
              <View style={[styles.avatar, { backgroundColor: c.accent.subtle }]}>
                <Text style={[styles.avatarText, { color: c.accent.default }]}>
                  {g.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.rowText, { color: c.text.primary }]} numberOfLines={1}>
                Soy {g.name}
              </Text>
              {busy === g.id && spinner}
            </Pressable>
          ))}
          <Pressable
            onPress={() => pick(null)}
            disabled={busy !== null}
            android_ripple={{ color: c.border.default }}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel="Soy otra persona"
          >
            <View style={[styles.avatar, { backgroundColor: c.surface.elevated }]}>
              <UserPlus size={18} color={c.text.secondary} strokeWidth={2} />
            </View>
            <Text style={[styles.rowText, { color: c.text.primary }]}>Soy otra persona</Text>
            {busy === "other" && spinner}
          </Pressable>
          {!!error && <Text style={[styles.error, { color: c.state.danger }]}>{error}</Text>}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12, textAlign: "center" },
  primaryBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#135BEC",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  rowText: { flex: 1, fontSize: 16, fontWeight: "600" },
});
