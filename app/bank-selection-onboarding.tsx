/**
 * bank-selection-onboarding.tsx — Tercer y último paso del onboarding: elegir de
 * qué bancos detectar transacciones automáticamente. Comparte la misma fuente de
 * verdad (ALLOWED_BANKS_KEY) que el selector de Settings → AutoDetectSection, así
 * que lo que se guarda acá es exactamente lo que se vería/editaría después ahí.
 * Convención de ALLOWED_BANKS_KEY: array vacío = "todos los bancos" (sin restricción).
 * Por eso, si el usuario no elige ningún banco acá, no se guarda un array vacío —
 * se apaga AUTO_DETECT_ENABLED_KEY en su lugar (ver handleSave).
 *
 * La ilustración reusa el mismo lenguaje visual (tarjetas flotantes banco → MyWallet)
 * de notification-onboarding.tsx, para que se lea como la continuación del mismo flujo.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Reanimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import {
  Wallet,
  Check,
  Landmark,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  PiggyBank,
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { KNOWN_BANKS, ALLOWED_BANKS_KEY, AUTO_DETECT_ENABLED_KEY } from "@/src/constants/banks";

const ACCENT = "#135BEC";

// Ícono + color distintivo por fila — cíclico, no son logos reales de cada banco
const BANK_STYLES = [
  { bg: "#FEF3C7", color: "#D97706", Icon: Landmark },
  { bg: "#F3E8FF", color: "#9333EA", Icon: Wallet },
  { bg: "#FEE2E2", color: "#DC2626", Icon: Banknote },
  { bg: "#DBEAFE", color: "#2563EB", Icon: CreditCard },
  { bg: "#E0E7FF", color: "#4F46E5", Icon: ArrowRightLeft },
  { bg: "#CFFAFE", color: "#0891B2", Icon: PiggyBank },
];

// ─── Flotación continua (translateY 0 → -amp → 0, loop), combinada con un
// transform estático (rotate) — deben ir en el MISMO array de transform, porque
// RN reemplaza (no fusiona) el array completo si viene en un style distinto.
function useFloat(
  amplitude: number,
  durationMs: number,
  rotateDeg: number,
  translateX: number,
  startDelayMs = 0,
) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      startDelayMs,
      withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [v, durationMs, startDelayMs]);
  return useAnimatedStyle(() => ({
    transform: [
      { translateX },
      { translateY: -v.value * amplitude },
      { rotate: `${rotateDeg}deg` },
    ],
  }));
}

// ─── Ilustración: dos tarjetas flotantes (banco → MyWallet) ──────────────────
function BankIllustration({ theme }: { theme: AppTheme }) {
  const st = useMemo(() => buildIllustrationStyles(theme), [theme]);
  const floatA = useFloat(8, 4000, -3, -18);
  const floatB = useFloat(8, 4000, 1, 14, 500);

  return (
    <View style={st.stage}>
      <Reanimated.View style={[st.cardA, floatA]}>
        <View style={[st.iconA, { backgroundColor: "#FEF3C7" }]}>
          <Landmark size={18} color="#B45309" strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.cardALabel}>BANCOLOMBIA</Text>
          <Text style={st.cardABody} numberOfLines={1}>
            Pagaste $45.000 en Rappi
          </Text>
        </View>
      </Reanimated.View>

      {/* Notificación real de MyWallet — mismo título/cuerpo que genera
          notifyBankTransaction() en notificationService.ts. Sin badges ni checks
          decorativos: una notificación de Android solo tiene ícono + título + cuerpo. */}
      <Reanimated.View style={[st.cardB, floatB]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={st.appIcon}
            resizeMode="cover"
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.cardBTitle} numberOfLines={1}>
              Nuevo gasto detectado — Bancolombia
            </Text>
            <Text style={st.cardBAmount} numberOfLines={1}>
              $45.000 · Pago en Rappi
            </Text>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function BankSelectionOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const st = useMemo(() => buildStyles(theme), [theme]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // Google Wallet siempre primero; el resto en orden alfabético
  const sortedBanks = useMemo(() => {
    const GOOGLE_WALLET = "com.google.android.apps.walletnfcrel";
    const wallet = KNOWN_BANKS.filter((b) => b.packageName === GOOGLE_WALLET);
    const rest = KNOWN_BANKS.filter((b) => b.packageName !== GOOGLE_WALLET).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es"),
    );
    return [...wallet, ...rest];
  }, []);

  const toggleBank = useCallback((packageName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      return next;
    });
  }, []);

  // El flujo de onboarding llega aquí con la pila [category-onboarding,
  // notification-onboarding, bank-selection-onboarding] (cada paso hace `push`,
  // no `replace`, para que el botón "atrás" de cada pantalla funcione). Un
  // `replace` simple aquí solo reemplaza este último escalón, dejando
  // "(tabs)" apilado ENCIMA de category-onboarding/notification-onboarding en
  // vez de como raíz — el siguiente `router.dismissAll()` (ej. al guardar un
  // gasto) volvía a category-onboarding en lugar del dashboard. `dismissAll()`
  // primero colapsa la pila a su base (category-onboarding, la ruta que
  // reemplazó a "(tabs)" al iniciar el onboarding) y luego el `replace` deja
  // "(tabs)" como única pantalla.
  const goToApp = useCallback(() => {
    router.dismissAll();
    router.replace("/(tabs)");
  }, [router]);

  const handleSave = useCallback(async () => {
    if (selected.size === 0) {
      // Ningún banco elegido: no hay forma de representar "ninguno" con
      // ALLOWED_BANKS_KEY (vacío ahí significa "todos" en el resto de la app),
      // así que lo correcto es apagar la detección por completo.
      await AsyncStorage.setItem(AUTO_DETECT_ENABLED_KEY, "false");
    } else {
      const allSelected = selected.size === KNOWN_BANKS.length;
      await AsyncStorage.setItem(
        ALLOWED_BANKS_KEY,
        allSelected ? "[]" : JSON.stringify([...selected]),
      );
    }
    goToApp();
  }, [selected, goToApp]);

  return (
    <SafeAreaView style={st.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <Pressable style={st.backBtn} onPress={() => router.back()} hitSlop={10}>
        <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
      </Pressable>

      <View style={st.header}>
        <Text style={st.title}>¿Qué bancos{"\n"}quieres rastrear?</Text>
        <Text style={st.subtitle}>
          MyWallet solo lee notificaciones de tus apps bancarias — nunca de mensajes, redes
          sociales ni nada más.
        </Text>
      </View>

      <BankIllustration theme={theme} />

      {/* Lista de bancos — revelación en cascada (FadeInDown escalonado) */}
      <View style={st.listCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.listContent}>
          {sortedBanks.map((bank, index) => {
            const isActive = selected.has(bank.packageName);
            const { bg, color, Icon } = BANK_STYLES[index % BANK_STYLES.length];
            return (
              <Reanimated.View
                key={bank.packageName}
                entering={FadeInDown.delay(300 + index * 70)
                  .duration(400)
                  .easing(Easing.out(Easing.cubic))}
              >
                <Pressable style={st.row} onPress={() => toggleBank(bank.packageName)}>
                  <View style={st.rowLeft}>
                    <View style={[st.bankIcon, { backgroundColor: bg }]}>
                      <Icon size={20} color={color} strokeWidth={2} />
                    </View>
                    <Text style={st.bankName}>{bank.displayName}</Text>
                  </View>
                  <View
                    style={[
                      st.toggle,
                      {
                        backgroundColor: isActive
                          ? ACCENT
                          : theme.isDark
                            ? theme.pillNeutral
                            : "#E2E8F0",
                      },
                    ]}
                  >
                    {isActive && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                </Pressable>
              </Reanimated.View>
            );
          })}
        </ScrollView>
      </View>

      <View style={st.footer}>
        <Pressable style={st.skipBtn} onPress={goToApp}>
          <Text style={st.skipText}>Omitir</Text>
        </Pressable>
        <Pressable style={st.saveBtn} onPress={handleSave}>
          <Text style={st.saveText}>Guardar y continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 20,
      marginTop: 14,
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: t.isDark ? 0 : 2,
    },
    header: { paddingHorizontal: 28, paddingTop: 20 },
    title: {
      fontSize: 28,
      fontWeight: "900",
      color: t.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: 12,
    },
    subtitle: { fontSize: 14, color: t.textSub, lineHeight: 21 },

    listCard: {
      flex: 1,
      backgroundColor: t.isDark ? t.itemBg : "#FFFFFF",
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -8 },
      elevation: t.isDark ? 0 : 2,
    },
    listContent: { paddingHorizontal: 28, paddingTop: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 72,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    bankIcon: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
    },
    bankName: { fontSize: 15, fontWeight: "600", color: t.text },
    toggle: {
      width: 22,
      height: 22,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
    },

    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: t.isDark ? t.itemBg : "#FFFFFF",
    },
    skipBtn: { paddingVertical: 16, paddingHorizontal: 8 },
    skipText: { fontSize: 14, fontWeight: "600", color: t.textSub },
    saveBtn: {
      backgroundColor: ACCENT,
      borderRadius: 9999,
      paddingVertical: 16,
      paddingHorizontal: 28,
      shadowColor: ACCENT,
      shadowOpacity: t.isDark ? 0 : 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: t.isDark ? 0 : 4,
    },
    saveText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
}

function buildIllustrationStyles(t: AppTheme) {
  return StyleSheet.create({
    stage: { height: 176, marginTop: 20, alignItems: "center", justifyContent: "center" },
    cardA: {
      position: "absolute",
      top: 8,
      width: 236,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: t.isDark ? t.itemBg : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      opacity: 0.75,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0.2 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    cardB: {
      position: "absolute",
      top: 66,
      width: 258,
      backgroundColor: t.isDark ? t.pillNeutral : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0.3 : 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    iconA: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    appIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      flexShrink: 0,
    },
    cardALabel: {
      fontSize: 10,
      fontWeight: "800",
      color: t.textSub,
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    cardABody: { fontSize: 12, fontWeight: "600", color: t.text },
    cardBTitle: { fontSize: 11, fontWeight: "700", color: t.text },
    cardBAmount: { fontSize: 13, fontWeight: "600", color: t.textSub, marginTop: 2 },
  });
}
