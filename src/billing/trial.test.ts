import { expiredTrialStart, isTrialActive, trialDaysLeft, trialEndsAt } from "./trial";
import { TRIAL_DAYS } from "./plans";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 6, 12);

describe("prueba de Pro", () => {
  it("dura TRIAL_DAYS días desde el inicio", () => {
    expect(trialEndsAt(T0)).toBe(T0 + TRIAL_DAYS * DAY);
  });

  it("está activa hasta el último instante y vence justo al cumplirse", () => {
    expect(isTrialActive(T0, T0)).toBe(true);
    expect(isTrialActive(T0, T0 + TRIAL_DAYS * DAY - 1)).toBe(true);
    expect(isTrialActive(T0, T0 + TRIAL_DAYS * DAY)).toBe(false);
  });

  it("sin inicio no hay prueba", () => {
    expect(isTrialActive(null, T0)).toBe(false);
    expect(trialDaysLeft(null, T0)).toBe(0);
  });

  it("cuenta los días que quedan redondeando hacia arriba", () => {
    expect(trialDaysLeft(T0, T0)).toBe(TRIAL_DAYS);
    expect(trialDaysLeft(T0, T0 + DAY)).toBe(TRIAL_DAYS - 1);
    // Con 3 horas restantes todavía queda "1 día".
    expect(trialDaysLeft(T0, T0 + TRIAL_DAYS * DAY - 3 * 3_600_000)).toBe(1);
    expect(trialDaysLeft(T0, T0 + TRIAL_DAYS * DAY)).toBe(0);
    expect(trialDaysLeft(T0, T0 + 30 * DAY)).toBe(0);
  });

  it("expiredTrialStart deja la prueba vencida", () => {
    expect(isTrialActive(expiredTrialStart(T0), T0)).toBe(false);
  });
});
