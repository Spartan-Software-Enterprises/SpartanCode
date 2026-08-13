import { bundledExtensions, listExtensions } from "./extensions";

describe("standalone extension catalog", () => {
  it("ships offline-safe templates, personas, and plugins", () => {
    expect(bundledExtensions).toHaveLength(3);
    expect(bundledExtensions.every((item) => item.offline)).toBe(true);
    expect(listExtensions("persona")[0]?.id).toBe("local-first-builder");
  });
});
