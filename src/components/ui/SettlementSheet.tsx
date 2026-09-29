/**
 * SettlementSheet — detalle de las cuentas de una lista con más personas: cuánto pagó cada
 * uno, cuánto le toca a cada uno (partes iguales) y quién le debe a quién. Se abre desde el
 * resumen de una línea bajo los pills del Dashboard.
 */
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { useAppTokens } from "@/src/theme/tokens";
import { transferText, type Settlement } from "@/src/utils/settlement";
import { formatBalance } from "@/src/utils/transactionFormatters";

export function SettlementSheet({
  visible,
  settlement,
  selfId,
  nameOf,
  onClose,
}: {
  visible: boolean;
  settlement: Settlement | null;
  selfId: string;
  nameOf: (id: string) => string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useAppTokens().colors;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={[styles.title, { color: c.text.primary }]}>Cuentas</Text>
      <Text style={[styles.subtitle, { color: c.text.secondary }]}>
        Partes iguales, con todos los gastos de la lista. Los ingresos no se reparten.
      </Text>

      {settlement && (
        <>
          <Text style={[styles.section, { color: c.text.secondary }]}>QUIÉN PAGÓ</Text>
          {settlement.paid.map((p) => (
            <View key={p.memberId || "self"} style={styles.row}>
              <Text style={[styles.name, { color: c.text.primary }]}>{nameOf(p.memberId)}</Text>
              <Text style={[styles.amount, { color: c.text.primary }]}>
                {formatBalance(p.paid)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: c.border.default }]} />
          <View style={styles.row}>
            <Text style={[styles.name, { color: c.text.secondary }]}>Total</Text>
            <Text style={[styles.amount, { color: c.text.secondary }]}>
              {formatBalance(settlement.total)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.name, { color: c.text.secondary }]}>A cada uno le toca</Text>
            <Text style={[styles.amount, { color: c.text.secondary }]}>
              {formatBalance(settlement.share)}
            </Text>
          </View>

          <Text style={[styles.section, { color: c.text.secondary }]}>PARA QUEDAR A MANO</Text>
          {settlement.transfers.length === 0 ? (
            <Text style={[styles.result, { color: c.text.primary }]}>Están a mano</Text>
          ) : (
            settlement.transfers.map((t) => (
              <Text key={`${t.from}-${t.to}`} style={[styles.result, { color: c.text.primary }]}>
                {transferText(t, selfId, nameOf, formatBalance)}
              </Text>
            ))
          )}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 22, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  name: { fontSize: 15, fontWeight: "600" },
  amount: { fontSize: 15, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  result: { fontSize: 16, fontWeight: "700", paddingVertical: 4 },
});
