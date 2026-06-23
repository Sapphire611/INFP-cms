import { hashPasswordWithSHA256, isValidSHA256Hash } from "@/lib/crypto";

describe("hashPasswordWithSHA256", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await hashPasswordWithSHA256("hello");
    expect(hash).toHaveLength(64);
    expect(isValidSHA256Hash(hash)).toBe(true);
  });

  it("produces different output for different inputs", async () => {
    const a = await hashPasswordWithSHA256("hello");
    const b = await hashPasswordWithSHA256("world");
    expect(a).not.toBe(b);
  });

  it("is deterministic for the same input", async () => {
    const a = await hashPasswordWithSHA256("hello");
    const b = await hashPasswordWithSHA256("hello");
    expect(a).toBe(b);
  });

  it("uses the salt from environment variable", async () => {
    process.env.NEXT_PUBLIC_PASSWORD_SALT = "custom-salt";
    const withCustomSalt = await hashPasswordWithSHA256("test");
    process.env.NEXT_PUBLIC_PASSWORD_SALT = "other-salt";
    const withOtherSalt = await hashPasswordWithSHA256("test");
    expect(withCustomSalt).not.toBe(withOtherSalt);
  });
});

describe("isValidSHA256Hash", () => {
  it("returns true for a valid 64-char hex string", () => {
    expect(isValidSHA256Hash("a".repeat(64))).toBe(true);
    expect(isValidSHA256Hash("0f".repeat(32))).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidSHA256Hash("")).toBe(false);
  });

  it("returns false for non-hex characters", () => {
    expect(isValidSHA256Hash("g".repeat(64))).toBe(false);
    expect(isValidSHA256Hash("z".repeat(64))).toBe(false);
  });

  it("returns false for wrong length", () => {
    expect(isValidSHA256Hash("abc123")).toBe(false);
    expect(isValidSHA256Hash("a".repeat(63))).toBe(false);
    expect(isValidSHA256Hash("a".repeat(65))).toBe(false);
  });
});
