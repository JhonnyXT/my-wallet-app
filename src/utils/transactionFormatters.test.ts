import {
  resolveCategory,
  formatDetailDate,
  formatDetailTime,
  formatDetailAmount,
  formatBalance,
  normalize,
  extractTagsFromTx,
  groupTransactionsByDay,
  dayLabel,
} from "./transactionFormatters";

describe("resolveCategory", () => {
  it("prioriza las categorías del usuario sobre el mapa legacy", () => {
    const userCats = [{ emoji: "🍔", name: "comida rápida" }];
    expect(resolveCategory("🍔", userCats, [])).toBe("Comida rápida");
  });

  it("usa las metas de ahorro si no hay categoría de usuario", () => {
    const goals = [{ emoji: "🎯", name: "vacaciones" }];
    expect(resolveCategory("🎯", [], goals)).toBe("Vacaciones");
  });

  it("cae al mapa legacy EMOJI_TO_CATEGORY_NAME si no hay match", () => {
    expect(resolveCategory("🍔", [], [])).toBe("Comida");
  });

  it("devuelve 'General' si no matchea en ningún lado", () => {
    expect(resolveCategory("🦄", [], [])).toBe("General");
  });
});

describe("formatDetailDate / formatDetailTime", () => {
  it("formatea fecha como 'D Mes Año'", () => {
    expect(formatDetailDate("2026-03-05T10:30:00.000")).toBe("5 Mar 2026");
  });

  it("formatea hora en formato 12h con sufijo a.m./p.m.", () => {
    expect(formatDetailTime("2026-03-05T09:05:00.000")).toBe("9:05 a.m.");
    expect(formatDetailTime("2026-03-05T13:05:00.000")).toBe("1:05 p.m.");
    expect(formatDetailTime("2026-03-05T00:00:00.000")).toBe("12:00 a.m.");
  });
});

describe("formatDetailAmount / formatBalance", () => {
  it("usa puntos de miles y valor absoluto (Regla inmutable #2)", () => {
    expect(formatDetailAmount(-40000)).toBe("$ 40.000");
    expect(formatDetailAmount(40000)).toBe("$ 40.000");
  });

  it("formatBalance conserva el signo (sin símbolo $ con espacio)", () => {
    expect(formatBalance(1500000)).toBe("$1.500.000");
  });
});

describe("normalize", () => {
  it("pasa a minúsculas y quita tildes para búsqueda tolerante", () => {
    expect(normalize("Almuerzo Rápido")).toBe("almuerzo rapido");
    expect(normalize("Café")).toBe("cafe");
  });
});

describe("extractTagsFromTx", () => {
  it("extrae tags desde el JSON de la columna tags", () => {
    const tx = { tags: JSON.stringify(["#Viaje", "#Familia"]) };
    expect(extractTagsFromTx(tx)).toEqual(["#viaje", "#familia"]);
  });

  it("cae a extraer #hashtags de la descripción si tags no es JSON válido", () => {
    const tx = { description: "Cena con amigos #Ocio #findesemana", tags: "no-es-json" };
    expect(extractTagsFromTx(tx)).toEqual(["#ocio", "#findesemana"]);
  });

  it("devuelve array vacío si no hay tags ni hashtags en la descripción", () => {
    expect(extractTagsFromTx({ description: "Mercado del mes" })).toEqual([]);
  });
});

describe("groupTransactionsByDay", () => {
  const now = new Date(2026, 8, 29, 10, 0); // 29 sep 2026 (martes)
  const tx = (id: number, date: string, amount: number) => ({ id, date, amount });

  it("intercala un encabezado por día con el neto del día", () => {
    const rows = groupTransactionsByDay(
      [
        tx(1, "2026-09-29T09:00:00.000", 50000),
        tx(2, "2026-09-29T08:00:00.000", -20000),
        tx(3, "2026-09-28T20:00:00.000", 10000),
      ],
      now,
    );
    expect(rows.map((r) => (r.kind === "day" ? `${r.label}:${r.net}` : r.key))).toEqual([
      "Hoy:-30000",
      "1",
      "2",
      "Ayer:-10000",
      "3",
    ]);
  });

  it("usa día de la semana y fecha, con año solo si es otro año", () => {
    expect(dayLabel("2026-09-22", now)).toBe("mar 22 sep");
    expect(dayLabel("2025-12-31", now)).toBe("mié 31 dic 2025");
  });

  it("lista vacía no produce encabezados", () => {
    expect(groupTransactionsByDay([], now)).toEqual([]);
  });
});
