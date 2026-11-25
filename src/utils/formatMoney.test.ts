import { formatMoneyInput, formatMoneyDisplay, formatCOP } from "./formatMoney";

describe("formatMoneyInput", () => {
  it("agrega puntos de miles a un string de dígitos", () => {
    expect(formatMoneyInput("196100")).toBe("196.100");
    expect(formatMoneyInput("1000000")).toBe("1.000.000");
  });

  it("descarta caracteres no numéricos", () => {
    expect(formatMoneyInput("$1.234abc")).toBe("1.234");
  });

  it("devuelve vacío si no hay dígitos", () => {
    expect(formatMoneyInput("")).toBe("");
    expect(formatMoneyInput("abc")).toBe("");
  });

  it("recorta a MAX_AMOUNT_DIGITS para no desbordar a notación exponencial (QA 2026-11-25)", () => {
    expect(formatMoneyInput("9".repeat(30))).toBe(formatMoneyInput("9".repeat(15)));
    expect(formatMoneyInput("9".repeat(30)).replace(/\./g, "")).toHaveLength(15);
  });
});

describe("formatMoneyDisplay", () => {
  it("formatea con puntos de miles, nunca con toLocaleString", () => {
    // Regla inmutable #2: el separador debe venir del regex, no de Intl/locale.
    expect(formatMoneyDisplay(196100)).toBe("196.100");
    expect(formatMoneyDisplay(1500000)).toBe("1.500.000");
  });

  it("redondea decimales", () => {
    expect(formatMoneyDisplay(1234.6)).toBe("1.235");
  });

  it("devuelve '0' para valores nulos, cero o negativos", () => {
    expect(formatMoneyDisplay(0)).toBe("0");
    expect(formatMoneyDisplay(-500)).toBe("0");
  });

  it("nunca cae en notación exponencial con valores extremos (QA 2026-11-25: '1e+21')", () => {
    expect(formatMoneyDisplay(1e21)).not.toContain("e");
    expect(formatMoneyDisplay(1e21)).not.toContain("E");
    expect(formatMoneyDisplay(Number.MAX_SAFE_INTEGER + 100)).not.toContain("e");
  });
});

describe("formatCOP", () => {
  it("antepone el símbolo $ con espacio", () => {
    expect(formatCOP(40000)).toBe("$ 40.000");
  });
});
