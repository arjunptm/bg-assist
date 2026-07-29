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
    expect(screen.getAllByRole("button", { name: /Add color for option/ })).toHaveLength(2);
    expect(document.querySelector('input[type="color"]')).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "Add color for Rusviet" }));
    expect(screen.getByRole("region", { name: "Rusviet color picker" })).toBeTruthy();
    expect(screen.getByLabelText("Hue")).toBeTruthy();
    expect(screen.getByLabelText("Saturation")).toBeTruthy();
    expect(screen.getByLabelText("Lightness")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Hue"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Saturation"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Lightness"), { target: { value: "50" } });
    expect((screen.getByLabelText("Hex color") as HTMLInputElement).value).toBe("#FF0000");
    fireEvent.change(screen.getByLabelText("Hex color"), { target: { value: "#BAD" } });
    expect(screen.getByRole("alert").textContent).toContain("six-digit color");
    expect(screen.getByRole("button", { name: "Apply color" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Hex color"), {
      target: { value: "#c63d4f" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply color" }));
    expect(screen.getByText("#C63D4F")).toBeTruthy();
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
            { name: "Rusviet", color: "#C63D4F", quantity: 1 },
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
