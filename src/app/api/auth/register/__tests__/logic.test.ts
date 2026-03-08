import { describe, it, expect } from "vitest";
import {
  validateRegisterInput,
  hashPassword,
  verifyPassword,
} from "../logic";

describe("validateRegisterInput", () => {
  it("accepts valid email, password, name", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      name: "Chris",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid email — no @", () => {
    const result = validateRegisterInput({
      email: "notanemail",
      password: "password123",
      name: "Chris",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects invalid email — no domain dot", () => {
    const result = validateRegisterInput({
      email: "user@nodot",
      password: "password123",
      name: "Chris",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects password shorter than 8 characters", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "short",
      name: "Chris",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/password/i);
  });

  it("rejects empty name", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      name: "",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      name: "   ",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts password of exactly 8 characters", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "12345678",
      name: "Chris",
    });
    expect(result.valid).toBe(true);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("mypassword123");
    const valid = await verifyPassword("mypassword123", hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("mypassword123");
    const valid = await verifyPassword("wrongpassword", hash);
    expect(valid).toBe(false);
  });

  it("produces a different hash each call (salt)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
    // Both should still verify
    expect(await verifyPassword("samepassword", hash1)).toBe(true);
    expect(await verifyPassword("samepassword", hash2)).toBe(true);
  });
});
