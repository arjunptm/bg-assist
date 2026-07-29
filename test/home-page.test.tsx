import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "../src/pages/HomePage";
import { createGroup } from "../src/lib/api";
import { rememberGroup } from "../src/lib/storage";

vi.mock("../src/lib/storage", () => ({
  listKnownGroups: vi.fn(async () => []),
  rememberGroup: vi.fn()
}));

vi.mock("../src/lib/api", () => ({ createGroup: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/g/:capability" element={<p>Opened group</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("home page flows", () => {
  it("leads with randomization and keeps privacy details available", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: /Randomize every role/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Game setup is shared. Player details stay local." })).toBeTruthy();
    expect(screen.getByText("Shared with the group")).toBeTruthy();
    expect(screen.getByText("Kept on this device")).toBeTruthy();
    expect(
      screen.getByText(/secret part of the link is stored server-side only as a SHA-256 hash/)
    ).toBeTruthy();
  });

  it("creates, remembers, and opens a new group", async () => {
    const capability = "a".repeat(43);
    vi.mocked(createGroup).mockResolvedValueOnce({
      capability,
      id: "group-id",
      name: "Friday Game Night",
      revision: 1,
      games: [],
      fetchedAt: "2026-07-28T00:00:00.000Z"
    });
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Create a group" }));
    fireEvent.change(screen.getByLabelText("Group name"), {
      target: { value: "Friday Game Night" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create group" }));

    await waitFor(() => expect(createGroup).toHaveBeenCalledWith("Friday Game Night"));
    expect(rememberGroup).toHaveBeenCalledWith(expect.objectContaining({
      capability,
      groupId: "group-id",
      name: "Friday Game Night"
    }));
    expect(await screen.findByText("Opened group")).toBeTruthy();
  });

  it("opens a valid pasted capability link without persisting player data", async () => {
    const capability = "b".repeat(43);
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Join a group" }));
    fireEvent.change(screen.getByLabelText("Game Night link"), {
      target: { value: `https://gamenight.ludicmethods.com/g/${capability}` }
    });
    fireEvent.click(screen.getByRole("button", { name: "Open group" }));

    expect(await screen.findByText("Opened group")).toBeTruthy();
    expect(createGroup).not.toHaveBeenCalled();
    expect(rememberGroup).not.toHaveBeenCalled();
  });

  it("rejects malformed group links visibly", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Join a group" }));
    fireEvent.change(screen.getByLabelText("Game Night link"), {
      target: { value: "not a group link" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Open group" }));

    expect(screen.getByRole("alert").textContent).toContain("Paste a valid Game Night group link.");
  });
});
