import { parseExpenseInput } from "./nlp";
import type { UserCategory } from "@/src/constants/categoryPresets";

describe("parseExpenseInput", () => {
  it("extrae monto, descripción y categoría de un input simple", () => {
    const result = parseExpenseInput("Uber 15000");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.description).toBe("Uber");
    expect(result!.categoryEmoji).toBe("🚗");
  });

  it("normaliza sufijo 'mil' a miles", () => {
    const result = parseExpenseInput("Café 4 mil");
    expect(result!.amount).toBe(4000);
  });

  it("acepta separador de miles con punto (no lo confunde con decimal)", () => {
    const result = parseExpenseInput("Mercado 15.000");
    expect(result!.amount).toBe(15000);
  });

  it("acepta un monto decimal de 1-2 dígitos (formato del docstring: 'Café 4.50')", () => {
    const result = parseExpenseInput("Café 4.50");
    expect(result!.amount).toBe(4.5);
  });

  it("devuelve null si no hay un monto detectable", () => {
    expect(parseExpenseInput("solo texto sin numeros")).toBeNull();
  });

  it("devuelve null para monto cero o negativo", () => {
    expect(parseExpenseInput("Gasto 0")).toBeNull();
  });

  it("usa 'Gasto' como descripción por defecto si el texto queda vacío", () => {
    const result = parseExpenseInput("15000");
    expect(result!.description).toBe("Gasto");
  });

  it("prioriza las keywords de categorías del usuario sobre el mapa legacy", () => {
    const userCats: UserCategory[] = [
      {
        id: "mascotas",
        emoji: "🎯",
        name: "Mascotas",
        colorBg: "#F1F5F9",
        colorAccent: "#475569",
        type: "expense",
        keywords: ["uber"],
        isPreset: false,
      },
    ];
    const result = parseExpenseInput("Uber 15000", userCats);
    expect(result!.categoryEmoji).toBe("🎯");
  });
});
