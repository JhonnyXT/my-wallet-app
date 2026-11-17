import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { SheetActions, SheetAddButton, SheetHeader, SheetLabel, useSheetPadding } from "@/src/components/ui/SheetParts";
import { EmojiSuggestPicker, useAutoEmoji } from "@/src/components/ui/EmojiSuggestPicker";
import { useTheme } from "@/src/context/ThemeContext";
import {
  PAYMENT_TYPE_EMOJI,
  paymentMethodEmoji,
  useSettingsStore,
  type PaymentMethod,
  type PaymentMethodType,
} from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";
import { catSheet } from "./settingsStyles";

// ─── Sección: Métodos de pago ─────────────────────────────────────────────────

const PAYMENT_TYPE_OPTIONS: { key: PaymentMethodType; label: string }[] = [
  { key: "cash", label: "💵 Efectivo" },
  { key: "debit", label: "💳 Débito / Tarjeta" },
  { key: "savings", label: "🐷 Ahorros" },
];

const PAYMENT_TYPE_PLAIN: Record<PaymentMethodType, string> = {
  cash: "Efectivo",
  debit: "Débito / Tarjeta",
  savings: "Ahorros",
};

const PAYMENT_ICON_CATALOG = [
  "💵",
  "💳",
  "🐷",
  "🏦",
  "📱",
  "💰",
  "🪙",
  "💸",
  "👛",
  "🏧",
  "💼",
  "🌐",
];

function PaymentMethodSheet({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target: PaymentMethod | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const tokens = useAppTokens();
  const sheetPad = useSheetPadding();
  const addMethod = useSettingsStore((st) => st.addPaymentMethod);
  const updateMethod = useSettingsStore((st) => st.updatePaymentMethod);

  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentMethodType>("cash");
  const icon = useAutoEmoji(PAYMENT_TYPE_EMOJI.cash);
  const { reset } = icon;

  useEffect(() => {
    if (!visible) return;
    setName(target?.name ?? "");
    setType(target?.type ?? "cash");
    reset(target ? paymentMethodEmoji(target) : PAYMENT_TYPE_EMOJI.cash, !!target);
  }, [visible, target, reset]);

  const handleType = (t: PaymentMethodType) => {
    setType(t);
    icon.onNameChange(name, PAYMENT_TYPE_EMOJI[t]);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Si coincide con el del tipo no se guarda: así sigue al tipo si luego cambia.
    const emoji = icon.emoji === PAYMENT_TYPE_EMOJI[type] ? undefined : icon.emoji;
    if (target) updateMethod(target.id, trimmed, type, emoji);
    else addMethod({ name: trimmed, type, emoji });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader
        title={target ? "Editar método" : "Nuevo método de pago"}
        subtitle="Dónde tienes o con qué mueves tu plata"
      />
      <SheetLabel first>Nombre</SheetLabel>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          icon.onNameChange(t, PAYMENT_TYPE_EMOJI[type]);
        }}
        placeholder="Ej: Nequi, Bancolombia…"
        placeholderTextColor={theme.textTertiary}
        style={{
          backgroundColor: theme.inputBg,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: theme.text,
        }}
        maxLength={24}
        autoCapitalize="words"
      />

      <SheetLabel>Tipo</SheetLabel>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {PAYMENT_TYPE_OPTIONS.map((o) => {
          const active = o.key === type;
          return (
            <Pressable
              key={o.key}
              onPress={() => handleType(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                gap: 4,
                backgroundColor: active ? "#DBEAFE" : theme.inputBg,
                borderWidth: 2,
                borderColor: active ? "#135BEC" : "transparent",
              }}
            >
              <Text style={{ fontSize: 20 }}>{PAYMENT_TYPE_EMOJI[o.key]}</Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontWeight: active ? "700" : "500",
                  color: active ? "#135BEC" : tokens.colors.text.secondary,
                }}
              >
                {PAYMENT_TYPE_PLAIN[o.key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SheetLabel>Ícono</SheetLabel>
      <EmojiSuggestPicker
        query={name}
        selected={icon.emoji}
        onSelect={icon.pick}
        catalog={PAYMENT_ICON_CATALOG}
      />

      <SheetActions
        confirmLabel={target ? "Guardar" : "Agregar"}
        onCancel={onClose}
        onConfirm={handleSave}
        disabled={!name.trim()}
      />
    </BottomSheet>
  );
}

export function PaymentMethodsSection() {
  const tokens = useAppTokens();
  const methods = useSettingsStore((s) => s.paymentMethods);
  const removeMethod = useSettingsStore((s) => s.removePaymentMethod);

  const [form, setForm] = useState<{ open: boolean; target: PaymentMethod | null }>({
    open: false,
    target: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [minMethodAlert, setMinMethodAlert] = useState(false);

  function confirmDelete(id: string, name: string) {
    if (methods.length <= 1) {
      setMinMethodAlert(true);
      return;
    }
    setDeleteDialog({ id, name });
  }

  return (
    <>
      <View>
        {methods.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setForm({ open: true, target: m })}
            android_ripple={{ color: tokens.colors.border.default }}
            style={[catSheet.row, { paddingHorizontal: 0 }]}
            accessibilityRole="button"
            accessibilityLabel={`${m.name}, ${PAYMENT_TYPE_PLAIN[m.type]}`}
          >
            <View
              style={[catSheet.emojiCircle, { backgroundColor: tokens.colors.surface.elevated }]}
            >
              <Text style={catSheet.emoji}>{paymentMethodEmoji(m)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[catSheet.name, { color: tokens.colors.text.primary }]}
                numberOfLines={1}
              >
                {m.name}
              </Text>
              <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
                {PAYMENT_TYPE_PLAIN[m.type]}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}>
              <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
              <TouchableOpacity
                onPress={() => confirmDelete(m.id, m.name)}
                hitSlop={8}
                style={{ padding: 4 }}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${m.name}`}
              >
                <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Pressable>
        ))}
      </View>

      <SheetAddButton
        label="Agregar método"
        onPress={() => setForm({ open: true, target: null })}
        style={{ marginTop: 4 }}
      />

      <PaymentMethodSheet
        visible={form.open}
        target={form.target}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
      />

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar método"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) removeMethod(deleteDialog.id);
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />

      <ConfirmDialog
        visible={minMethodAlert}
        variant="info"
        title="No es posible"
        message="Debes tener al menos un método de pago activo."
        confirmLabel="Entendido"
        onConfirm={() => setMinMethodAlert(false)}
        onCancel={() => setMinMethodAlert(false)}
      />
    </>
  );
}
