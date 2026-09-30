import { AuthError, authErrorMessage, classifyAuthError } from "./errors";

describe("classifyAuthError", () => {
  it.each([
    [{ code: "12501" }, "cancelled"],
    [{ code: "ASYNC_OP_IN_PROGRESS" }, "cancelled"],
    [{ code: "auth/network-request-failed" }, "offline"],
    [{ code: "7" }, "offline"],
    [{ code: "PLAY_SERVICES_NOT_AVAILABLE" }, "unavailable"],
    [{ code: "auth/requires-recent-login" }, "recent-login"],
    [{ code: "auth/internal-error" }, "unknown"],
    [new Error("boom"), "unknown"],
    [null, "unknown"],
  ])("%j → %s", (error, kind) => {
    expect(classifyAuthError(error)).toBe(kind);
  });

  it("respeta un AuthError ya clasificado", () => {
    expect(classifyAuthError(new AuthError("offline"))).toBe("offline");
  });
});

describe("authErrorMessage", () => {
  it("no muestra nada al cancelar", () => {
    expect(authErrorMessage("cancelled")).toBeNull();
  });

  it("tiene texto para el resto", () => {
    for (const kind of ["offline", "unavailable", "recent-login", "unknown"] as const) {
      expect(authErrorMessage(kind)).toEqual(expect.any(String));
    }
  });
});
