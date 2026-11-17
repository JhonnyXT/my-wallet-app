import {
  AuthError,
  authErrorMessage,
  classifyAuthError,
  classifySpaceError,
  SpaceError,
  spaceErrorMessage,
} from "./errors";
import { OfflineError } from "./net";

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

describe("classifySpaceError", () => {
  it("sin conexión: tope de tiempo o Firestore sin servidor", () => {
    expect(classifySpaceError(new OfflineError())).toBe("offline");
    expect(classifySpaceError({ code: "firestore/unavailable" })).toBe("offline");
  });

  it("reglas que lo niegan, errores propios y desconocidos", () => {
    expect(classifySpaceError({ code: "firestore/permission-denied" })).toBe("not-allowed");
    expect(classifySpaceError(new SpaceError("invalid-code"))).toBe("invalid-code");
    expect(classifySpaceError(new Error("x"))).toBe("unknown");
  });

  it("cada tipo tiene un mensaje", () => {
    for (const kind of [
      "offline",
      "signed-out",
      "invalid-code",
      "taken",
      "not-allowed",
      "unknown",
    ] as const) {
      expect(spaceErrorMessage(kind).length).toBeGreaterThan(10);
    }
  });
});
