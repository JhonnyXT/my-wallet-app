import { guessCategoryEmoji } from "./theme";

// Reproduce la colisión real de categoryPresets.ts: "Suscripciones" (gasto)
// y "Salario" (ingreso) comparten la keyword "mensualidad"; "Regalos" (gasto)
// y "Extra" (ingreso) comparten "regalo" y hasta el mismo emoji 🎁. Sin
// filtrar por `isExpense`, guessCategoryEmoji devolvía la PRIMERA coincidencia
// del array sin importar si la transacción era en realidad un gasto o un
// ingreso — bug real encontrado 2026-09-23 (flujo de notificaciones bancarias).
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

describe("guessCategoryEmoji", () => {
  it("sin isExpense (comportamiento legacy): devuelve la primera coincidencia sin filtrar por tipo", () => {
    expect(guessCategoryEmoji("Consignación mensualidad Bancolombia", userCats)).toBe("📱");
  });

  it("con isExpense=false (ingreso): 'mensualidad' da Salario (💼), no Suscripciones (📱, gasto)", () => {
    expect(guessCategoryEmoji("Consignación mensualidad Bancolombia", userCats, false)).toBe("💼");
  });

  it("con isExpense=true (gasto): 'mensualidad' da Suscripciones (📱), no Salario (💼, ingreso)", () => {
    expect(guessCategoryEmoji("Débito mensualidad Netflix", userCats, true)).toBe("📱");
  });

  it("con isExpense=false: 'regalo' da 🎁 Extra (ingreso), coincide igual porque comparten emoji, pero filtra por tipo real", () => {
    expect(guessCategoryEmoji("Recibiste de Juan, motivo regalo", userCats, false)).toBe("🎁");
  });

  it("con isExpense=true: 'regalo' da 🎁 Regalos (gasto), no la categoría de ingreso Extra", () => {
    // Mismo emoji en ambas categorías por diseño (coincidencia real en
    // categoryPresets.ts) — lo que importa es que el filtro no se salte al
    // tipo equivocado cuando los emojis SÍ difieren (ver test de mensualidad).
    expect(guessCategoryEmoji("Compra regalo cumpleaños", userCats, true)).toBe("🎁");
  });

  it("sin match en ningún tipo relevante: cae a 💸 genérico, no a una categoría del tipo contrario", () => {
    // "salario" solo existe en la categoría de ingreso — filtrando a gasto no
    // debe matchear nada y no debe fallar.
    expect(guessCategoryEmoji("pago de salario", userCats, true)).toBe("💸");
  });
});
