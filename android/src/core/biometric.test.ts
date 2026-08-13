import { authorizeSecretAccess } from "./biometric";

const adapter: any = {
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
};

describe("opt-in biometric secret access", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not prompt when disabled", async () => {
    await expect(authorizeSecretAccess(false, adapter)).resolves.toEqual({
      allowed: true,
      reason: "disabled",
    });
    expect(adapter.authenticateAsync).not.toHaveBeenCalled();
  });

  it("requires enrolled authentication when enabled", async () => {
    await expect(authorizeSecretAccess(true, adapter)).resolves.toEqual({
      allowed: true,
      reason: "authenticated",
    });
    expect(adapter.authenticateAsync).toHaveBeenCalled();
  });

  it("fails closed when hardware is unavailable", async () => {
    adapter.hasHardwareAsync.mockResolvedValueOnce(false);
    await expect(authorizeSecretAccess(true, adapter)).resolves.toEqual({
      allowed: false,
      reason: "unavailable",
    });
  });
});
