import * as LocalAuthentication from "expo-local-authentication";

export type BiometricAccess = {
  allowed: boolean;
  reason: "disabled" | "unavailable" | "cancelled" | "authenticated";
};

type AuthAdapter = Pick<
  typeof LocalAuthentication,
  "hasHardwareAsync" | "isEnrolledAsync" | "authenticateAsync"
>;

export async function authorizeSecretAccess(
  enabled: boolean,
  adapter: AuthAdapter = LocalAuthentication,
): Promise<BiometricAccess> {
  if (!enabled) return { allowed: true, reason: "disabled" };
  if (!(await adapter.hasHardwareAsync()) || !(await adapter.isEnrolledAsync()))
    return { allowed: false, reason: "unavailable" };
  const result = await adapter.authenticateAsync({
    promptMessage: "Unlock SpartanCode secrets",
    fallbackLabel: "Use device passcode",
  });
  return result.success
    ? { allowed: true, reason: "authenticated" }
    : { allowed: false, reason: "cancelled" };
}
