import { canUse, hasPro } from "./entitlement";
import { TRIAL_DAYS } from "./plans";
import { useEntitlementStore } from "./useEntitlementStore";

// babel-jest sube este mock por encima de los imports.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const DAY = 86_400_000;

beforeEach(() => useEntitlementStore.getState().resetEntitlement());

describe("hasPro", () => {
  it("Free sin prueba no es Pro", () => {
    expect(hasPro({ plan: "free", trialStartedAt: null })).toBe(false);
  });
  it("la suscripción es Pro", () => {
    expect(hasPro({ plan: "pro", trialStartedAt: null })).toBe(true);
  });
  it("la prueba en curso es Pro y vencida no", () => {
    const now = Date.now();
    expect(hasPro({ plan: "free", trialStartedAt: now - DAY }, now)).toBe(true);
    expect(hasPro({ plan: "free", trialStartedAt: now - (TRIAL_DAYS + 1) * DAY }, now)).toBe(false);
  });
});

describe("useEntitlementStore", () => {
  it("la prueba se puede empezar una sola vez", () => {
    const s = useEntitlementStore.getState();
    s.startProTrial();
    const first = useEntitlementStore.getState().trialStartedAt;
    expect(first).not.toBeNull();
    expect(canUse("sharedSpaces")).toBe(true);

    s.simulateTrialExpired();
    s.expireTrialIfDue();
    useEntitlementStore.getState().startProTrial();
    expect(useEntitlementStore.getState().trialStartedAt).not.toBe(first);
    expect(useEntitlementStore.getState().trialUsed).toBe(true);
  });

  it("al vencer vuelve a Free y deja el aviso pendiente", () => {
    const s = useEntitlementStore.getState();
    s.startProTrial();
    s.simulateTrialExpired();
    s.expireTrialIfDue();
    const after = useEntitlementStore.getState();
    expect(after.trialStartedAt).toBeNull();
    expect(after.trialEndedNotice).toBe(true);
    expect(canUse("cloudBackup")).toBe(false);

    after.dismissTrialEndedNotice();
    expect(useEntitlementStore.getState().trialEndedNotice).toBe(false);
  });

  it("una prueba vigente no se vence antes de tiempo", () => {
    const s = useEntitlementStore.getState();
    s.startProTrial();
    s.expireTrialIfDue();
    expect(useEntitlementStore.getState().trialEndedNotice).toBe(false);
    expect(canUse("cloudBackup")).toBe(true);
  });

  it("suscribirse activa Pro y limpia la prueba; volver a Free lo quita", () => {
    const s = useEntitlementStore.getState();
    s.startProTrial();
    s.subscribePro();
    expect(useEntitlementStore.getState()).toMatchObject({ plan: "pro", trialStartedAt: null });
    expect(canUse("sharedSpaces")).toBe(true);

    useEntitlementStore.getState().setFree();
    expect(canUse("sharedSpaces")).toBe(false);
    // La prueba ya se usó: no se vuelve a ofrecer.
    expect(useEntitlementStore.getState().trialUsed).toBe(true);
  });

  it("reiniciar deja el plan como instalación nueva", () => {
    useEntitlementStore.getState().subscribePro();
    useEntitlementStore.getState().resetEntitlement();
    expect(useEntitlementStore.getState()).toMatchObject({
      plan: "free",
      trialStartedAt: null,
      trialUsed: false,
      trialEndedNotice: false,
    });
  });
});
