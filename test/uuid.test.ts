import { describe, expect, it, vi } from "vitest";
import { createUuid } from "../src/lib/uuid";

describe("browser UUID creation", () => {
  it("uses the native randomUUID implementation when available", () => {
    const expected = "12345678-1234-4123-8123-123456789abc";
    const randomUUID = vi.fn(() => expected);
    const getRandomValues = vi.fn();

    expect(createUuid({ randomUUID, getRandomValues })).toBe(expected);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("creates an RFC 4122 version 4 UUID using getRandomValues as a fallback", () => {
    const getRandomValues = vi.fn(<T extends ArrayBufferView | null>(values: T): T => {
      const bytes = values as Uint8Array;
      bytes.forEach((_, index) => {
        bytes[index] = index;
      });
      return values;
    });

    const uuid = createUuid({ getRandomValues });

    expect(uuid).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
