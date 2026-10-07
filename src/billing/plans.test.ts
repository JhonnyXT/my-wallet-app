import { ANNUAL_SAVINGS_PCT, FEATURE_PITCH, PRICES_COP, PRO_PERKS, TRIAL_DAYS } from "./plans";

describe("planes", () => {
  it("precios definidos para Colombia (COP)", () => {
    expect(PRICES_COP).toEqual({ monthly: 14900, annual: 99900 });
    expect(TRIAL_DAYS).toBe(14);
  });

  it("el anual ahorra frente a 12 meses mensuales", () => {
    expect(PRICES_COP.annual).toBeLessThan(PRICES_COP.monthly * 12);
    expect(ANNUAL_SAVINGS_PCT).toBe(44);
  });

  it("cada función de Pro tiene explicación y hay beneficios para mostrar", () => {
    expect(FEATURE_PITCH.cloudBackup.length).toBeGreaterThan(10);
    expect(FEATURE_PITCH.sharedSpaces.length).toBeGreaterThan(10);
    expect(PRO_PERKS.length).toBeGreaterThan(0);
  });
});
