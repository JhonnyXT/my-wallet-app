/**
 * Primer piloto de tests de componentes (deuda técnica, AGENTS.md → Deuda técnica documentada).
 * `ListRow` se eligió porque no depende de SQLite/AsyncStorage y tiene lógica no trivial en el
 * accessibilityLabel (combina label+detail, o usa el override) — ver convención de mocks en
 * jest.config.js (setupFiles) y `jest/reanimatedMock.js`.
 */
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ListRow } from "./ListRow";

describe("ListRow", () => {
  it("muestra el label", () => {
    render(<ListRow label="Categorías" />);
    expect(screen.getByText("Categorías")).toBeTruthy();
  });

  it("combina label y detail en el accessibilityLabel cuando hay detail", () => {
    render(<ListRow label="Tus listas" detail="4" onPress={() => {}} />);
    expect(screen.getByLabelText("Tus listas, 4")).toBeTruthy();
  });

  it("usa solo el label como accessibilityLabel sin detail", () => {
    render(<ListRow label="Cerrar sesión" onPress={() => {}} />);
    expect(screen.getByLabelText("Cerrar sesión")).toBeTruthy();
  });

  it("accessibilityLabelOverride tiene prioridad sobre label+detail", () => {
    render(
      <ListRow
        label="Mostrar ingresos"
        detail="Activado"
        accessibilityLabelOverride="Mostrar ingresos, activado"
        onPress={() => {}}
      />,
    );
    expect(screen.getByLabelText("Mostrar ingresos, activado")).toBeTruthy();
    expect(screen.queryByLabelText("Mostrar ingresos, Activado")).toBeNull();
  });

  it("llama a onPress al tocar la fila", () => {
    const onPress = jest.fn();
    render(<ListRow label="Eliminar cuenta" onPress={onPress} />);
    fireEvent.press(screen.getByText("Eliminar cuenta"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("sin onPress, no es accesible como botón (fila informativa)", () => {
    render(<ListRow label="Versión" detail="v1.1.0" />);
    const row = screen.getByLabelText("Versión, v1.1.0");
    expect(row.props.accessibilityRole).toBeUndefined();
  });
});
