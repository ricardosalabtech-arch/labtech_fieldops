import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./db";

describe("auth.password", () => {
  it("hashes a password and verifies it correctly", () => {
    const password = "minhasenha123";
    const hashed = hashPassword(password);
    
    expect(hashed).not.toBe(password);
    expect(hashed).toContain(":");
    expect(verifyPassword(password, hashed)).toBe(true);
  });

  it("rejects wrong password", () => {
    const hashed = hashPassword("correct-password");
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });

  it("rejects malformed hash", () => {
    expect(verifyPassword("test", "malformed")).toBe(false);
    expect(verifyPassword("test", "")).toBe(false);
  });

  it("produces different hashes for same password (salt)", () => {
    const hash1 = hashPassword("samepass");
    const hash2 = hashPassword("samepass");
    expect(hash1).not.toBe(hash2);
    // Both should still verify
    expect(verifyPassword("samepass", hash1)).toBe(true);
    expect(verifyPassword("samepass", hash2)).toBe(true);
  });
});
