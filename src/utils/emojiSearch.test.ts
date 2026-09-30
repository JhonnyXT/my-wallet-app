import { ALL_CATEGORY_EMOJIS, suggestEmojis } from "./emojiSearch";

describe("suggestEmojis", () => {
  it("sin texto no sugiere nada", () => {
    expect(suggestEmojis("")).toEqual([]);
    expect(suggestEmojis("  ")).toEqual([]);
  });

  it("encuentra por palabra exacta", () => {
    expect(suggestEmojis("Gimnasio")[0]).toBe("🏋️");
    expect(suggestEmojis("Mascotas")[0]).toBe("🐾");
  });

  it("sugiere mientras se escribe (prefijo)", () => {
    expect(suggestEmojis("gim")).toContain("🏋️");
    expect(suggestEmojis("gaso")[0]).toBe("⛽");
  });

  it("ignora tildes y mayúsculas", () => {
    expect(suggestEmojis("EDUCACIÓN")[0]).toBe("🎓");
    expect(suggestEmojis("Café")).toContain("☕");
  });

  it("tolera plurales y errores de tipeo", () => {
    expect(suggestEmojis("perros")).toContain("🐕");
    expect(suggestEmojis("gimnacio")).toContain("🏋️");
  });

  it("con varias palabras suma relevancia", () => {
    expect(suggestEmojis("Comida mascota").slice(0, 3)).toContain("🐾");
  });

  it("reconoce métodos de pago y deudas comunes", () => {
    expect(suggestEmojis("Nequi")[0]).toBe("📱");
    expect(suggestEmojis("Bancolombia")[0]).toBe("🏦");
    expect(suggestEmojis("Alcancía")[0]).toBe("🐷");
    expect(suggestEmojis("Icetex")[0]).toBe("🎓");
  });

  it("respeta el límite", () => {
    expect(suggestEmojis("pago", 2)).toHaveLength(2);
  });

  it("no hay emojis repetidos en el catálogo", () => {
    expect(new Set(ALL_CATEGORY_EMOJIS).size).toBe(ALL_CATEGORY_EMOJIS.length);
  });
});
