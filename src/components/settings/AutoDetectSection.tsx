import { useCallback, useEffect, useState } from "react";
import { AppState, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import RNAndroidNotificationListener from "react-native-android-notification-listener";
import { BellOff, Check, Landmark, Radar } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Card, Divider } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ListRow } from "@/src/components/ui/ListRow";
import { SheetHeader } from "@/src/components/ui/SheetParts";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { AUTO_DETECT_ENABLED_KEY, ALLOWED_BANKS_KEY } from "@/src/constants/banks";
import {
  areNotificationsAllowed,
  askNotificationPermissionIfPossible,
  requestNotificationPermissions,
} from "@/src/services/notificationService";
import { useAppTokens } from "@/src/theme/tokens";
import { KNOWN_BANKS } from "@/src/utils/notificationParser";

// ─── Sección: Detección automática de transacciones ──────────────────────────

const DETECT_COLOR = "#0D9488";
const BANKS_COLOR = "#EA580C";

export function AutoDetectSection() {
  const tokens = useAppTokens();
  const insets = useSafeAreaInsets();
  const ACCENT = "#135BEC";

  const [enabled, setEnabled] = useState(false);
  const [allowedBanks, setAllowedBanks] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  // Permiso de push (distinto del acceso del listener): sin él la transacción se detecta pero
  // Android descarta el aviso en silencio.
  const [alertsAllowed, setAlertsAllowed] = useState(true);
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

  // Cargar configuración desde AsyncStorage al montar
  useEffect(() => {
    (async () => {
      const savedEnabled = await AsyncStorage.getItem(AUTO_DETECT_ENABLED_KEY);
      const savedBanks = await AsyncStorage.getItem(ALLOWED_BANKS_KEY);
      if (savedEnabled === "true") setEnabled(true);
      if (savedBanks) {
        try {
          const parsed = JSON.parse(savedBanks);
          if (Array.isArray(parsed)) setAllowedBanks(parsed);
        } catch {
          // Datos corruptos: ignorar y usar configuración por defecto
        }
      }
    })();
    checkPermission();
    areNotificationsAllowed().then(setAlertsAllowed);
    // Solo al abrir: `checkPermission` se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-verificar permiso cuando el usuario vuelve de ajustes del sistema
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPermissionAndAutoEnable();
      }
    });
    return () => sub.remove();
    // Un solo listener de AppState; `checkPermissionAndAutoEnable` se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      setHasPermission(status === "authorized");
    } catch {
      setHasPermission(false);
    }
  }, []);

  const checkPermissionAndAutoEnable = useCallback(async () => {
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      const authorized = status === "authorized";
      setHasPermission(authorized);
      if (authorized) {
        const wasEnabled = (await AsyncStorage.getItem(AUTO_DETECT_ENABLED_KEY)) === "true";
        setEnabled(true);
        await AsyncStorage.setItem(AUTO_DETECT_ENABLED_KEY, "true");
        // Al activarse por primera vez desde la pantalla del sistema, pedir también el permiso
        // de push (si el sistema aún lo permite); el resto lo cubre la fila de aviso.
        if (!wasEnabled) await askNotificationPermissionIfPossible();
      }
      setAlertsAllowed(await areNotificationsAllowed());
    } catch {
      setHasPermission(false);
    }
  }, []);

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (value && !hasPermission) {
        setShowPermDialog(true);
        return;
      }
      if (value) {
        // La detección solo lee notificaciones (permiso de listener, ya validado arriba);
        // mostrar la transacción como push requiere además el permiso normal de
        // notificaciones de la app. requestNotificationPermissions() no vuelve a pedirlo
        // si ya fue concedido antes (por esta misma sección o por Alertas de presupuesto).
        await requestNotificationPermissions();
        setAlertsAllowed(await areNotificationsAllowed());
      }
      setEnabled(value);
      await AsyncStorage.setItem(AUTO_DETECT_ENABLED_KEY, value ? "true" : "false");
    },
    [hasPermission],
  );

  const handleOpenPermissionSettings = useCallback(() => {
    setShowPermDialog(false);
    RNAndroidNotificationListener.requestPermission();
  }, []);

  const toggleBank = useCallback(
    async (packageName: string) => {
      const updated = allowedBanks.includes(packageName)
        ? allowedBanks.filter((p) => p !== packageName)
        : [...allowedBanks, packageName];
      setAllowedBanks(updated);
      await AsyncStorage.setItem(ALLOWED_BANKS_KEY, JSON.stringify(updated));
    },
    [allowedBanks],
  );

  return (
    <>
      {/* Toggle principal + filas condicionales, todo en una sola tarjeta agrupada
          (antes cada fila era su propia tarjeta con borde — se fusionó a pedido
          del usuario, la tarjeta con borde queda a nivel de sección, no por fila). */}
      <Card padded={false}>
        <ListRow
          label="Detectar transacciones"
          icon={<Radar size={16} color="#FFFFFF" strokeWidth={2} />}
          iconBg={DETECT_COLOR}
          right={
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ true: ACCENT, false: tokens.colors.border.default }}
              thumbColor={enabled ? "#fff" : tokens.colors.text.secondary}
            />
          }
        />

        {enabled && (
          <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Bancos activos"
              icon={<Landmark size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={BANKS_COLOR}
              showChevron
              onPress={() => setShowBankSelector(true)}
            />
            {!alertsAllowed && (
              <>
                <Divider inset={tokens.spacing.md * 2 + 34} />
                <ListRow
                  label="Alertas desactivadas"
                  detail="Activar"
                  icon={<BellOff size={16} color="#FFFFFF" strokeWidth={2} />}
                  iconBg="#DC2626"
                  showChevron
                  onPress={async () => {
                    await requestNotificationPermissions();
                    setAlertsAllowed(await areNotificationsAllowed());
                  }}
                />
              </>
            )}
          </Reanimated.View>
        )}
      </Card>

      {/* Aviso de permiso */}
      <ConfirmDialog
        visible={showPermDialog}
        variant="info"
        emoji="🔔"
        align="left"
        title="Acceso a notificaciones"
        message={
          "MyWallet leerá notificaciones de tus apps bancarias para detectar transacciones automáticamente.\n\n" +
          "· Solo apps bancarias que tú elijas\n" +
          "· Procesamiento 100% en tu dispositivo\n" +
          "· Ningún dato sale de tu teléfono\n" +
          "· No accede a mensajes, fotos ni otras apps\n\n" +
          'Se abrirá la configuración del sistema. Busca "MyWallet" y activa el acceso.'
        }
        confirmLabel="Abrir ajustes"
        onConfirm={handleOpenPermissionSettings}
        onCancel={() => setShowPermDialog(false)}
      />

      {/* Selector de bancos */}
      <BottomSheet
        visible={showBankSelector}
        onClose={() => setShowBankSelector(false)}
        style={{ paddingBottom: insets.bottom + 12, maxHeight: "80%" }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <SheetHeader
            title="Bancos activos"
            subtitle="Elige de qué apps detectar transacciones. Si no seleccionas ninguno, se usan todos."
          />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {[...KNOWN_BANKS]
            .sort((a, b) => {
              const aSelected = allowedBanks.length === 0 || allowedBanks.includes(a.packageName);
              const bSelected = allowedBanks.length === 0 || allowedBanks.includes(b.packageName);
              if (aSelected === bSelected) return 0;
              return aSelected ? -1 : 1;
            })
            .map((bank) => {
              const isSelected =
                allowedBanks.length === 0 || allowedBanks.includes(bank.packageName);
              return (
                <TouchableOpacity
                  key={bank.packageName}
                  style={[autoS.bankRow, { borderBottomColor: tokens.colors.border.default }]}
                  onPress={() => toggleBank(bank.packageName)}
                  activeOpacity={0.65}
                >
                  <ThemedText variant="body" style={{ flex: 1, fontWeight: "600" }}>
                    {bank.displayName}
                  </ThemedText>
                  <View
                    style={[
                      autoS.bankCheck,
                      {
                        borderColor: isSelected ? ACCENT : tokens.colors.border.default,
                        backgroundColor: isSelected ? ACCENT : "transparent",
                      },
                    ]}
                  >
                    {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
        {allowedBanks.length > 0 && (
          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 14 }}
            onPress={async () => {
              setAllowedBanks([]);
              await AsyncStorage.setItem(ALLOWED_BANKS_KEY, "[]");
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, color: ACCENT, fontWeight: "600" }}>
              Seleccionar todos
            </Text>
          </TouchableOpacity>
        )}
      </BottomSheet>
    </>
  );
}

const autoS = StyleSheet.create({
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bankCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
