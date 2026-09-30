import { webClientIdFrom } from "./googleServices";

// Forma real de un google-services.json con dos apps Android en el mismo proyecto.
const json = {
  project_info: { project_id: "mywallet-test-jb" },
  client: [
    {
      client_info: { android_client_info: { package_name: "com.mywallet.app.test" } },
      oauth_client: [
        { client_id: "android-test.apps.googleusercontent.com", client_type: 1 },
        { client_id: "web.apps.googleusercontent.com", client_type: 3 },
      ],
    },
    {
      client_info: { android_client_info: { package_name: "com.mywallet.app" } },
      oauth_client: [{ client_id: "web.apps.googleusercontent.com", client_type: 3 }],
    },
  ],
};

describe("webClientIdFrom", () => {
  it("devuelve el cliente web (tipo 3) del paquete pedido", () => {
    expect(webClientIdFrom(json, "com.mywallet.app.test")).toBe("web.apps.googleusercontent.com");
    expect(webClientIdFrom(json, "com.mywallet.app")).toBe("web.apps.googleusercontent.com");
  });

  it("undefined si el paquete no está o Google aún no se habilitó", () => {
    expect(webClientIdFrom(json, "com.mywallet")).toBeUndefined();
    expect(
      webClientIdFrom(
        {
          client: [
            { client_info: { android_client_info: { package_name: "x" } }, oauth_client: [] },
          ],
        },
        "x",
      ),
    ).toBeUndefined();
    expect(webClientIdFrom(null, "x")).toBeUndefined();
  });
});
