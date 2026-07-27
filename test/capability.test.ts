import { describe, expect, it } from "vitest";
import { generateCapability, hashCapability } from "../worker/capability";

describe("group capabilities", () => {
  it("creates 256-bit base64url capability tokens", () => {
    const token = generateCapability();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateCapability()).not.toBe(token);
  });

  it("hashes capabilities deterministically without retaining the token", async () => {
    const token = generateCapability();
    const hash = await hashCapability(token);
    expect(hash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await hashCapability(token)).toBe(hash);
    expect(hash).not.toBe(token);
  });
});

