import { expect, it } from "vitest";
import {
  registrationInput,
  passwordInput,
  onboardingInput,
  confirmationDestination,
} from "@/modules/business/auth-contracts";
it("rejects legacy password payloads and authorization injection", () => {
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
it("accepts six-character letter-number passwords and rejects incomplete combinations", () => {
  const input = (password: string) => passwordInput.safeParse(password);
  expect(input("abc123").success).toBe(true);
  expect(input("ABC123").success).toBe(true);
  expect(input("LongPassword123!").success).toBe(true);
  for (const password of ["ab123", "123456", "abcdef", "!!!!!!"])
    expect(input(password).success).toBe(false);
});

it("starts registration with only an email and normalizes it", () => {
  expect(registrationInput.parse({ email: "Customer@Example.com" })).toEqual({
    email: "customer@example.com",
  });
});
it("routes email links through the actual onboarding state", () => {
  expect(
    confirmationDestination("email", "/auth/setup?flow=registration"),
  ).toBe("/auth/setup?flow=registration");
  expect(confirmationDestination("magiclink", "/onboarding")).toBe(
    "/onboarding",
  );
  expect(confirmationDestination("magiclink", "/portal/orders")).toBe(
    "/portal/orders",
  );
});
