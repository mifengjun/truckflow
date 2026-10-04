import { expect, it } from "vitest";
import {
  registrationInput,
  onboardingInput,
  confirmationDestination,
} from "@/modules/business/auth-contracts";
it("rejects mismatched passwords and authorization injection", () => {
  expect(
    registrationInput.safeParse({
      email: "user@example.com",
      password: "LongPassword123!",
      confirmPassword: "different",
    }).success,
  ).toBe(false);
  expect(
    registrationInput.safeParse({
      email: "user@example.com",
      password: "LongPassword123!",
      confirmPassword: "LongPassword123!",
      roles: ["admin"],
    }).success,
  ).toBe(false);
  expect(
    onboardingInput.safeParse({
      companyName: "Company",
      contact: "Name",
      phone: "+1 5550000",
      customerId: "foreign",
    }).success,
  ).toBe(false);
});
it("routes signup separately from recovery and refuses external destinations", () => {
  expect(confirmationDestination("signup", "/onboarding")).toBe("/onboarding");
  expect(confirmationDestination("invite", "/onboarding")).toBe("/auth/setup");
  expect(confirmationDestination("recovery", "/onboarding")).toBe(
    "/auth/setup",
  );
  expect(() =>
    confirmationDestination("signup", "https://evil.example/"),
  ).toThrow();
  expect(() => confirmationDestination("unknown", "/onboarding")).toThrow();
});
