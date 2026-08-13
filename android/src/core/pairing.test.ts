import { decodePairingPayload } from "./pairing";

function encode(value: unknown) {
  return btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

describe("QR pairing payloads", () => {
  it("accepts an unexpired origin-bound payload", () => {
    expect(
      decodePairingPayload(
        encode({
          version: 1,
          origin: "https://bridge.example",
          token: "secret",
          scopes: ["snapshot"],
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      ).endpoint,
    ).toBe("https://bridge.example");
  });

  it("rejects expired and mismatched payloads", () => {
    expect(() =>
      decodePairingPayload(
        encode({
          version: 1,
          origin: "https://bridge.example",
          token: "secret",
          scopes: [],
          expiresAt: new Date(Date.now() - 1).toISOString(),
        }),
      ),
    ).toThrow("expired");
    expect(() =>
      decodePairingPayload(
        encode({
          version: 1,
          origin: "https://bridge.example",
          token: "secret",
          scopes: [],
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
        "https://other.example",
      ),
    ).toThrow("match");
  });
});
