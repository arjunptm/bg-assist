import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GameEditorPage } from "../src/pages/GameEditorPage";
import { saveGame } from "../src/lib/api";

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

vi.mock("../src/lib/api", () => ({ saveGame: vi.fn(async () => ({
  id: "group-id", name: "Friday Game Night", revision: 1, games: [], fetchedAt: "2026-07-28T00:00:00.000Z"
})) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("mobile game editor flows", () => {
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
    expect(screen.getAllByRole("combobox", { name: /Color for option/ })).toHaveLength(2);
  });

  it("saves a strictly shared game draft with the selected option color", async () => {
    render(
      <MemoryRouter initialEntries={["/g/capability/games/new"]}>
        <Routes>
          <Route path="/g/:capability/games/new" element={<GameEditorPage />} />
          <Route path="/g/:capability" element={<p>Group library</p>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Game name"), { target: { value: "Scythe" } });
    fireEvent.change(screen.getByPlaceholderText("Factions"), { target: { value: "Factions" } });
    const optionInputs = screen.getAllByPlaceholderText(/Factions [12]/);
    fireEvent.change(optionInputs[0]!, { target: { value: "Rusviet" } });
    fireEvent.change(optionInputs[1]!, { target: { value: "Crimea" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Color for Rusviet" }), {
      target: { value: "red" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save game" }));

    await waitFor(() => expect(saveGame).toHaveBeenCalledTimes(1));
    const [capability, draft] = vi.mocked(saveGame).mock.calls[0]!;
    expect(capability).toBe("capability");
    expect(draft).toMatchObject({
      name: "Scythe",
      assignmentSets: [
        {
          name: "Factions",
          options: [
            { name: "Rusviet", color: "red", quantity: 1 },
            { name: "Crimea", quantity: 1 }
          ]
        }
      ],
      bannedCombinations: []
    });
    expect(JSON.stringify(draft)).not.toMatch(/player|assignmentResult/i);
    expect(await screen.findByText("Group library")).toBeTruthy();
  });
});
