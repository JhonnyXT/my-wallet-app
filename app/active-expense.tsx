/**
 * Active Expense Input State — replica pixel-perfect de Stitch.
 *
 * Flujo: voice-input → (2s) → este modal
 * Estructura:
 *   • ScrollView: Monto · Pills de selector · Data pills · Transcripción
 *   • Footer fijo: barra de acción (X | Nuevo Gasto | ✓) + tags
 */
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, Check, ChevronDown, Plus, Edit3 } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useExpenseStore, DateOption, RecurrenceType, AccountType } from "@/src/store/useExpenseStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";

// ─── Constantes de diseño (Stitch Figma) ─────────────────────────────────────
const BG = "#F8FAFC";
const BORDER = "#F1F5F9";
const RED = "#EF4444";
const BLUE = "#135BEC";
const SLATE_900 = "#0F172A";
const SLATE_600 = "#475569";
const SLATE_400 = "#94A3B8";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCOP(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString("es-ES")}`;
}

const DATE_OPTIONS: { key: DateOption; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "daybeforeyesterday", label: "Anteayer" },
  { key: "custom", label: "Calendario" },
];

const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string }[] = [
  { key: "once", label: "Una vez" },
  { key: "weekly", label: "Semanal" },
  { key: "biweekly", label: "Quincenal" },
  { key: "monthly", label: "Mensual" },
  { key: "yearly", label: "Anual" },
];

const ACCOUNT_OPTIONS: { key: AccountType; label: string }[] = [
  { key: "cash", label: "Efectivo" },
  { key: "savings", label: "Ahorros" },
  { key: "credit", label: "Tarjeta" },
];

const SUGGESTED_TAGS = ["#viaje", "#trabajo", "#comida", "#salud", "#ocio"];

// ─── Componente pill selector (scroll horizontal) ────────────────────────────
function PillSelector<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (k: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
      {options.map((opt) => {
        const active = opt.key === selected;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt.label}
            </Text>
            {!active && <ChevronDown size={12} color={SLATE_600} strokeWidth={2} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Data pill (Category / Amount / Note) ────────────────────────────────────
function DataPill({ label, value, emoji }: { label: string; value: string; emoji?: string }) {
  return (
    <View style={styles.dataPill}>
      {emoji ? <Text style={styles.dataPillEmoji}>{emoji}</Text> : null}
      <Text style={styles.dataPillLabel}>{label}</Text>
      <Text
        style={[styles.dataPillValue, label === "Monto" && { color: RED }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function ActiveExpenseScreen() {
  const insets = useSafeAreaInsets();
  const {
    amount, categoryEmoji, categoryName,
    date, note, rawTranscript, recurrence, account, tags,
    setDate, setRecurrence, setAccount, setNote,
    addTag, removeTag, reset,
  } = useExpenseStore();

  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const [tagInput, setTagInput] = useState("");

  // ─── Guardar gasto ───────────────────────────────────────────────────────
  async function handleConfirm() {
    if (amount <= 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTransaction(amount, note || rawTranscript || "Gasto por voz", categoryEmoji);
    reset();
    router.dismissAll();
  }

  function handleClose() {
    reset();
    router.dismissAll();
  }

  function handleAddTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (t) {
      addTag(`#${t}`);
      setTagInput("");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ══════════════════════════════════════════════════════════════════
          CONTENIDO SCROLLEABLE
          ══════════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Monto principal ───────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.amountSection}>
          <Text style={styles.amountText}>
            {amount > 0 ? fmtCOP(amount) : "$ 0"}
          </Text>
        </Animated.View>

        {/* ── Pills de selección rápida ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.selectorsSection}>
          {/* Fecha */}
          <PillSelector
            options={DATE_OPTIONS}
            selected={date}
            onSelect={setDate}
          />
          {/* Recurrencia */}
          <PillSelector
            options={RECURRENCE_OPTIONS}
            selected={recurrence}
            onSelect={setRecurrence}
          />
          {/* Cuenta */}
          <PillSelector
            options={ACCOUNT_OPTIONS}
            selected={account}
            onSelect={setAccount}
          />
        </Animated.View>

        {/* ── Data pills (resultado del parser) ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)} style={styles.dataPillsRow}>
          <DataPill
            emoji={categoryEmoji}
            label="Categoría"
            value={categoryName}
          />
          <DataPill
            label="Monto"
            value={amount > 0 ? fmtCOP(amount) : "—"}
          />
          <DataPill
            label="Nota"
            value={note || rawTranscript || "—"}
          />
        </Animated.View>

        {/* ── Área de transcripción editable ───────────────────────── */}
        <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.transcriptBox}>
          <TextInput
            value={note || rawTranscript}
            onChangeText={setNote}
            multiline
            style={styles.transcriptInput}
            placeholderTextColor={SLATE_400}
            placeholder="Descripción del gasto..."
          />
          <View style={styles.transcriptEditIcon}>
            <Edit3 size={16} color={SLATE_400} strokeWidth={1.5} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER FIJO (barra de acción + tags)
          ══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        {/* Tags */}
        <View style={styles.tagsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Tags actuales */}
            {(tags.length > 0 ? tags : SUGGESTED_TAGS).map((tag) => (
              <Pressable
                key={tag}
                onPress={() =>
                  tags.includes(tag) ? removeTag(tag) : addTag(tag)
                }
                style={[
                  styles.tagPill,
                  tags.includes(tag) && styles.tagPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    tags.includes(tag) && styles.tagTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}

            {/* Input para nuevo tag */}
            <View style={styles.tagInputPill}>
              <Plus size={12} color={SLATE_400} strokeWidth={2} />
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                placeholder="tag"
                placeholderTextColor={SLATE_400}
                style={styles.tagInputText}
                returnKeyType="done"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </View>

        {/* Barra de acción: X | título | ✓ */}
        <View style={styles.actionBar}>
          {/* Botón cerrar */}
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
            <X size={18} color={SLATE_600} strokeWidth={2} />
          </Pressable>

          {/* Título centrado */}
          <Text style={styles.actionTitle}>Nuevo Gasto</Text>

          {/* Botón confirmar */}
          <Pressable
            onPress={handleConfirm}
            style={[
              styles.confirmBtn,
              amount <= 0 && styles.confirmBtnDisabled,
            ]}
            disabled={amount <= 0}
          >
            <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },

  // ── Monto ──────────────────────────────────────────────────────────────────
  amountSection: {
    alignItems: "center",
    paddingBottom: 24,
  },
  amountText: {
    fontSize: 56,
    fontWeight: "700",
    color: RED,
    letterSpacing: -1.5,
    lineHeight: 60,
    textAlign: "center",
  },

  // ── Selectors ──────────────────────────────────────────────────────────────
  selectorsSection: {
    gap: 10,
    marginBottom: 24,
  },
  pillScroll: {
    flexGrow: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    color: SLATE_900,
    lineHeight: 20,
  },
  pillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // ── Data pills ─────────────────────────────────────────────────────────────
  dataPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  dataPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    maxWidth: "100%",
  },
  dataPillEmoji: { fontSize: 14, lineHeight: 18 },
  dataPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: SLATE_600,
    letterSpacing: -0.3,
  },
  dataPillValue: {
    fontSize: 12,
    fontWeight: "500",
    color: SLATE_900,
    flexShrink: 1,
  },

  // ── Transcripción ──────────────────────────────────────────────────────────
  transcriptBox: {
    minHeight: 140,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E2E8F0",
    padding: 20,
    marginBottom: 8,
  },
  transcriptInput: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1E293B",
    lineHeight: 30,
    flex: 1,
    textAlignVertical: "top",
  },
  transcriptEditIcon: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: "rgba(241,245,249,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.5)",
  },

  // Tags
  tagsSection: {
    paddingVertical: 10,
    paddingLeft: 16,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  tagPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  tagTextActive: {
    color: BLUE,
    fontWeight: "600",
  },
  tagInputPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  tagInputText: {
    fontSize: 12,
    color: SLATE_900,
    minWidth: 40,
    maxWidth: 80,
    padding: 0,
  },

  // Action bar
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: SLATE_900,
    letterSpacing: -0.45,
  },
  confirmBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
});
