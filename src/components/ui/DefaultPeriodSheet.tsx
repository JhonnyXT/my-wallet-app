/**
 * DefaultPeriodSheet — hoja "Pago y período" (Ajustes y "Pago y período" del menú del
 * calendario). El formulario vive en PayPeriodForm.
 */
import { useEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PayPeriodForm } from "@/src/components/ui/PayPeriodForm";
import { useSettingsStore } from "@/src/store/useSettingsStore";

export function DefaultPeriodSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const saved = useSettingsStore((s) => s.defaultPeriod);
  const setDefaultPeriod = useSettingsStore((s) => s.setDefaultPeriod);
  // Cada apertura remonta el formulario desde lo guardado (descarta borradores sin aplicar).
  const [openCount, setOpenCount] = useState(0);
  useEffect(() => {
    if (visible) setOpenCount((n) => n + 1);
  }, [visible]);

  // El Modal de la hoja no se reacomoda al abrir el teclado (edge-to-edge) y el
  // KeyboardAvoidingView no mide bien dentro de él: el teclado del monto tapaba la hoja
  // entera (visto en dispositivo). Se levanta el contenido con la altura real del teclado.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <BottomSheet visible={visible} onClose={onClose} style={styles.container}>
      <View style={{ paddingBottom: keyboardHeight }}>
        <PayPeriodForm
          key={openCount}
          initial={saved}
          onApply={(cadence) => {
            setDefaultPeriod(cadence);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 36 },
});
