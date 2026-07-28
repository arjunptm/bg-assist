import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GameEditorPage } from "../src/pages/GameEditorPage";

vi.mock("../src/hooks/useGroup", () => ({
  useGroup: () => ({
    group: {
      id: "group-id",
      name: "Friday Game Night",
      revision: 1,
      games: [],
      fetchedAt: "2026-07-28T00:00:00.000Z"
    },
    loading: false,
    stale: false
  })
}));

vi.mock("../src/lib/api", () => ({ saveGame: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe("mobile game editor compatibility", () => {
  it("opens a new game draft when randomUUID is unavailable", () => {
    const nativeCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto)
    });

    render(
      <MemoryRouter initialEntries={["/g/capability/games/new"]}>
        <Routes>
          <Route
            path="/g/:capability/games/new"
            element={<GameEditorPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "New game" })).toBeTruthy();
    expect(screen.getByLabelText("Game name")).toBeTruthy();
    expect(screen.getAllByPlaceholderText(/Option [12]/)).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("Powers, abilities, or setup notes")).toHaveLength(2);
  });
});
