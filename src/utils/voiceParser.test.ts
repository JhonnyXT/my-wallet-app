import { normalizeMoneyText, replaceAmountInNote, processVoiceInput } from "./voiceParser";

describe("normalizeMoneyText", () => {
  it("convierte comas de separador de miles a puntos (formato COP)", () => {
    expect(normalizeMoneyText("gasté $40,000 en mercado")).toBe("gasté $40.000 en mercado");
  });

  it("no toca texto sin separadores de miles", () => {
    expect(normalizeMoneyText("gasté 40 mil en mercado")).toBe("gasté 40 mil en mercado");
  });
});

describe("replaceAmountInNote", () => {
  it("reemplaza un monto en miles por su formato COP", () => {
    expect(replaceAmountInNote("gasté 40 mil en comida", 40000)).toBe("gasté $40.000 en comida");
  });

  it("devuelve el texto original si el monto es 0 o negativo", () => {
    expect(replaceAmountInNote("sin monto detectado", 0)).toBe("sin monto detectado");
  });
});

describe("processVoiceInput — montos", () => {
  it("extrae montos en dígitos con 'mil'", () => {
    expect(processVoiceInput("gasté 30 mil en almuerzo").amount).toBe(30000);
  });

  it("extrae montos en palabras ('treinta mil')", () => {
    expect(processVoiceInput("gasté treinta mil en almuerzo").amount).toBe(30000);
  });

  it("extrae montos formateados con puntos ('$40.000')", () => {
    expect(processVoiceInput("pagué $40.000 de arriendo").amount).toBe(40000);
  });

  it("extrae millones en dígitos y palabras", () => {
    expect(processVoiceInput("recibí 5 millones de sueldo").amount).toBe(5_000_000);
    expect(processVoiceInput("recibí cinco millones de sueldo").amount).toBe(5_000_000);
  });
});

describe("processVoiceInput — tipo gasto/ingreso", () => {
  it("detecta gasto por keyword ('gasté')", () => {
    expect(processVoiceInput("gasté 20 mil en taxi").isExpense).toBe(true);
  });

  it("detecta ingreso por keyword ('recibí')", () => {
    expect(processVoiceInput("recibí 20 mil de un amigo").isExpense).toBe(false);
  });
});

describe("processVoiceInput — categoría con tolerancia a typos (fuzzyIncludes)", () => {
  it("detecta la categoría con la palabra exacta", () => {
    const r = processVoiceInput("gasté 20 mil en almuerzo");
    expect(r._categoryDetected).toBe(true);
    expect(r.categoryEmoji).toBe("🍔");
  });

  it("tolera un error de tipeo de 1 carácter en una keyword de 5+ letras", () => {
    // "almuerso" en vez de "almuerzo" — ver AGENTS.md: fuzzyIncludes tolera
    // distancia de Levenshtein 1 para palabras de 5-7 caracteres.
    const r = processVoiceInput("gasté 20 mil en almuerso");
    expect(r._categoryDetected).toBe(true);
    expect(r.categoryEmoji).toBe("🍔");
  });

  it("no detecta categoría si no hay ninguna keyword reconocible", () => {
    // Ojo: evitar palabras que compartan substring con un keyword corto real
    // (ej. "gaste" contiene "gas", keyword de Hogar — fuzzyIncludes hace match
    // exacto de substring sin longitud mínima). No es un bug de este test:
    // es un false positive conocido de la implementación real.
    const r = processVoiceInput("20 mil qzxjklw");
    expect(r._categoryDetected).toBe(false);
  });
});

describe("processVoiceInput — categoría NO cruza gasto/ingreso (bug real 2026-09-23)", () => {
  // userCats reproduce la colisión real de categoryPresets.ts: "Suscripciones"
  // (gasto) y "Salario" (ingreso) comparten la keyword "mensualidad"; "Regalos"
  // (gasto) y "Extra" (ingreso) comparten "regalo" y hasta el mismo emoji 🎁.
  // Sin filtrar por isExpense, extractCategory devolvía la PRIMERA coincidencia
  // del array sin importar el tipo real de la transacción.
  const userCats = [
    {
      id: "1",
      emoji: "📱",
      name: "Suscripciones",
      colorBg: "",
      colorAccent: "",
      type: "expense" as const,
      isPreset: true,
      keywords: ["suscripcion", "mensualidad", "plan"],
    },
    {
      id: "2",
      emoji: "🎁",
      name: "Regalos",
      colorBg: "",
      colorAccent: "",
      type: "expense" as const,
      isPreset: true,
      keywords: ["regalo", "obsequio"],
    },
    {
      id: "3",
      emoji: "💼",
      name: "Salario",
      colorBg: "",
      colorAccent: "",
      type: "income" as const,
      isPreset: true,
      keywords: ["salario", "mensualidad"],
    },
    {
      id: "4",
      emoji: "🎁",
      name: "Extra",
      colorBg: "",
      colorAccent: "",
      type: "income" as const,
      isPreset: true,
      keywords: ["regalo", "bono"],
    },
  ];

  it("'mensualidad' en un ingreso da Salario (💼), no Suscripciones (📱, gasto)", () => {
    const r = processVoiceInput("recibí 2 millones de mensualidad del trabajo", userCats);
    expect(r.isExpense).toBe(false);
    expect(r.categoryEmoji).toBe("💼");
  });

  it("'mensualidad' en un gasto da Suscripciones (📱), no Salario (💼, ingreso)", () => {
    const r = processVoiceInput("pagué 50 mil de mensualidad de Netflix", userCats);
    expect(r.isExpense).toBe(true);
    expect(r.categoryEmoji).toBe("📱");
  });

  it("'regalo' en un ingreso da la categoría Extra (nombre correcto), no Regalos", () => {
    const r = processVoiceInput("recibí 30 mil de regalo de cumpleaños", userCats);
    expect(r.isExpense).toBe(false);
    expect(r.categoryName).toBe("Extra");
  });

  it("'regalo' en un gasto da la categoría Regalos (nombre correcto), no Extra", () => {
    const r = processVoiceInput("gasté 30 mil en un regalo para mi mamá", userCats);
    expect(r.isExpense).toBe(true);
    expect(r.categoryName).toBe("Regalos");
  });
});
