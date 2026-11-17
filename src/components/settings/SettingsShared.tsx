import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import {
  SHEET_PADDING_X,
  SheetActions,
  SheetHeader,
  useSheetPadding,
} from "@/src/components/ui/SheetParts";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppTokens } from "@/src/theme/tokens";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useStyles } from "./settingsStyles";

/** Wrapper compartido por todas las hojas de Ajustes: BottomSheet + SheetHeader + ScrollView. */
export function SettingsSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tokens = useAppTokens();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={{ paddingBottom: insets.bottom + 12, maxHeight: "85%" }}
    >
      <View style={{ paddingHorizontal: SHEET_PADDING_X }}>
        <SheetHeader title={title} subtitle={subtitle} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SHEET_PADDING_X,
          paddingBottom: insets.bottom + tokens.spacing.xl,
          gap: tokens.spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </BottomSheet>
  );
}

// ─── Modal de edición genérico (campo de texto + número) ──────────────────────

export function InputModal({
  visible,
  title,
  subtitle,
  placeholder,
  value,
  keyboardType = "default",
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  placeholder: string;
  value: string;
  keyboardType?: "default" | "numeric";
  onConfirm: (val: string) => void;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const sheetPad = useSheetPadding();
  const isMoney = keyboardType === "numeric";

  const toDisplay = (raw: string) => (isMoney ? formatMoneyInput(raw) : raw);

  const [display, setDisplay] = useState(() => toDisplay(value));

  // Sincronizar cuando cambia el valor externo o el modal se abre
  useEffect(() => {
    if (visible) setDisplay(toDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value]);

  const handleChange = (text: string) => {
    if (isMoney) {
      const digits = text.replace(/\D/g, "");
      setDisplay(formatMoneyInput(digits));
    } else {
      setDisplay(text);
    }
  };

  const handleConfirm = () => {
    onConfirm(isMoney ? display.replace(/\D/g, "") : display);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader title={title} subtitle={subtitle} />
      {isMoney && <Text style={s.modalMoneyPrefix}>$</Text>}
      <TextInput
        style={[s.modalInput, isMoney && s.modalInputMoney]}
        value={display}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSub}
        keyboardType={isMoney ? "number-pad" : keyboardType}
        autoFocus
      />
      {isMoney && display.length > 0 && <Text style={s.modalMoneySuffix}>COP</Text>}
      <SheetActions onCancel={onClose} onConfirm={handleConfirm} />
    </BottomSheet>
  );
}

// ─── Modal selector genérico ──────────────────────────────────────────────────

export function SelectorModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingBottom: 40 }}>
      <Text style={s.sheetTitle}>{title}</Text>
      {options.map((opt, i) => (
        <View key={opt.key}>
          <TouchableOpacity
            style={s.sheetOption}
            onPress={() => {
              onSelect(opt.key);
              onClose();
            }}
            activeOpacity={0.65}
          >
            <Text
              style={[
                s.sheetOptionText,
                opt.key === selected && { color: theme.accent, fontWeight: "700" },
              ]}
            >
              {opt.label}
            </Text>
            {opt.key === selected && <Check size={16} color={theme.accent} strokeWidth={2.5} />}
          </TouchableOpacity>
          {i < options.length - 1 && <View style={s.sheetSep} />}
        </View>
      ))}
    </BottomSheet>
  );
}
