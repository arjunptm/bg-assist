import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../src/pages/HomePage";

vi.mock("../src/lib/storage", () => ({
  listKnownGroups: vi.fn(async () => []),
  rememberGroup: vi.fn()
}));

vi.mock("../src/lib/api", () => ({ createGroup: vi.fn() }));

describe("public privacy explanation", () => {
  it("explains the workflow and all three storage boundaries", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "How it works" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Privacy and storage" })).toBeTruthy();
    expect(screen.getByText("Shared / Cloudflare D1")).toBeTruthy();
    expect(screen.getByText("Private / This browser")).toBeTruthy();
    expect(screen.getByText("Temporary / This session")).toBeTruthy();
    expect(
      screen.getByText("Anyone with a group link can view and edit that group.")
    ).toBeTruthy();
    expect(
      screen.getByText(/secret part of a group link is stored server-side only as a SHA-256 hash/)
    ).toBeTruthy();
  });
});
