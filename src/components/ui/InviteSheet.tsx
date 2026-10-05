/**
 * InviteSheet — el código para unirse a una lista compartida (Sync Fase 4, RF-01/02): grande y
 * en dos grupos para dictarlo, cuándo vence y "Compartir" con la hoja del sistema (WhatsApp…).
 */
import { Share, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Share2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { SheetHeader, useSheetPadding } from "@/src/components/ui/SheetParts";
import { formatInviteCode, type Invite } from "@/src/sync";
import { useAppTokens } from "@/src/theme/tokens";
import { buildInviteText, inviteExpiryLabel } from "@/src/utils/listShareText";

export interface InviteSheetProps {
  visible: boolean;
  /** null mientras no hay código (la hoja no se muestra sin uno). */
  invite: Invite | null;
  emoji: string;
  name: string;
  onClose: () => void;
}

export function InviteSheet({ visible, invite, emoji, name, onClose }: InviteSheetProps) {
  const tokens = useAppTokens();
  const c = tokens.colors;
  const padding = useSheetPadding();

  const share = () => {
    if (!invite) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: buildInviteText({
        emoji,
        name,
        code: formatInviteCode(invite.code),
        expiresAt: invite.expiresAt,
      }),
    }).catch(() => undefined);
  };

  return (
    <BottomSheet visible={visible && invite !== null} onClose={onClose} style={padding}>
      <SheetHeader
        title="Invita a alguien"
        subtitle={`Quien escriba este código en la app entra a ${emoji} ${name} y registra gastos contigo.`}
      />
      {invite && (
        <>
          <View
            style={[
              styles.codeBox,
              { backgroundColor: c.surface.elevated, borderRadius: tokens.radius.lg },
            ]}
          >
            <Text
              style={[styles.code, { color: c.text.primary }]}
              selectable
              accessibilityLabel={`Código ${invite.code.split("").join(" ")}`}
            >
              {formatInviteCode(invite.code)}
            </Text>
            <Text style={[styles.expiry, { color: c.text.secondary }]}>
              Vence el {inviteExpiryLabel(invite.expiresAt)}
            </Text>
          </View>
          <Text style={[styles.hint, { color: c.text.secondary }]}>
            En su teléfono: Ajustes → Tus listas → Unirme con un código.
          </Text>
          <PressableScale
            onPress={share}
            style={styles.shareBtn}
            accessibilityRole="button"
            accessibilityLabel="Compartir código"
          >
            <Share2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.shareText}>Compartir código</Text>
          </PressableScale>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  codeBox: { alignItems: "center", paddingVertical: 22, marginTop: 4 },
  code: { fontSize: 36, fontWeight: "800", letterSpacing: 6, fontVariant: ["tabular-nums"] },
  expiry: { fontSize: 13, marginTop: 6 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: "center" },
  shareBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#135BEC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
