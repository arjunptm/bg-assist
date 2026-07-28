import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GameSetupPage } from "../src/pages/GameSetupPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

vi.mock("../src/hooks/useGroup", () => {
  const group = {
    id: "group-id",
    name: "Friday Game Night",
    revision: 1,
    fetchedAt: "2026-07-28T00:00:00.000Z",
    games: [
      {
        id: "game-id",
        name: "The Thing",
        revision: 1,
        assignmentSets: [
          {
            id: "characters",
            name: "Characters",
            options: [
              {
                id: "copper",
                name: "Dr. Copper",
                description: "Look at another character's card.",
                color: "blue",
                quantity: 1
              }
            ]
          }
        ],
        bannedCombinations: []
      }
    ]
  };

  return {
    useGroup: () => ({ group, loading: false, stale: false })
  };
});

vi.mock("../src/lib/storage", () => {
  const roster = ["Zoe", "Ben", "Arjun", "mia", "Chandra", "Dev", "Eva", "Farah", "Gita"];
  return {
    getRoster: vi.fn(async () => roster),
    setRoster: vi.fn()
  };
});

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={["/g/capability/games/game-id/setup"]}>
      <Routes>
        <Route
          path="/g/:capability/games/:gameId/setup"
          element={<GameSetupPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("assignment option descriptions", () => {
  it("shows the description beneath an assigned option", async () => {
    renderSetup();

    fireEvent.click(await screen.findByRole("button", { name: /Arjun/ }));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle Characters" }));

    const resultCard = (await screen.findByRole("heading", { name: "Arjun" })).closest("article");
    expect(resultCard).toBeTruthy();
    expect(within(resultCard!).getByText("Dr. Copper")).toBeTruthy();
    expect(within(resultCard!).getByText(/Color: Blue/)).toBeTruthy();
    expect(within(resultCard!).getByText("Look at another character's card.")).toBeTruthy();
  });
});

describe("local setup controls", () => {
  it("sorts remembered players and preserves selection while filtering", async () => {
    renderSetup();

    const playerGroup = await screen.findByRole("group", { name: "Remembered players" });
    expect(within(playerGroup).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Arjun",
      "Ben",
      "Chandra",
      "Dev",
      "Eva",
      "Farah",
      "Gita",
      "mia",
      "Zoe"
    ]);

    fireEvent.click(within(playerGroup).getByRole("button", { name: /Arjun/ }));
    fireEvent.change(screen.getByLabelText("Filter players"), { target: { value: "mi" } });
    expect(within(playerGroup).getByRole("button", { name: /mia/ })).toBeTruthy();
    expect(within(playerGroup).queryByRole("button", { name: /Arjun/ })).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter players"), { target: { value: "" } });
    expect(within(playerGroup).getByRole("button", { name: /Arjun/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("uses an inline confirmation before starting over", async () => {
    const confirm = vi.spyOn(window, "confirm");
    renderSetup();

    const playerGroup = await screen.findByRole("group", { name: "Remembered players" });
    fireEvent.click(within(playerGroup).getByRole("button", { name: /Arjun/ }));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle Characters" }));
    expect(await screen.findByRole("heading", { name: "Assignments" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Clear current assignments?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Assignments" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Clear current assignments?" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Assignments" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear assignments" }));
    expect(screen.queryByRole("heading", { name: "Assignments" })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Assignments cleared");
    expect(within(playerGroup).getByRole("button", { name: /Arjun/ }).getAttribute("aria-pressed")).toBe("true");
    const availableOptions = screen.getByText("Available options").closest("details");
    expect(within(availableOptions!).getByRole("button", { name: /Dr. Copper/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("explains when no different constrained reshuffle exists", async () => {
    renderSetup();

    const playerGroup = await screen.findByRole("group", { name: "Remembered players" });
    fireEvent.click(within(playerGroup).getByRole("button", { name: /Arjun/ }));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle Characters" }));
    fireEvent.click(await screen.findByRole("button", { name: "Re-shuffle Characters" }));

    expect(screen.getByRole("status").textContent).toContain("No different assignment is available while the other sets stay fixed");
  });

  it("applies and reconciles temporary player exclusions", async () => {
    renderSetup();

    const playerGroup = await screen.findByRole("group", { name: "Remembered players" });
    const playerButton = within(playerGroup).getByRole("button", { name: /Arjun/ });
    fireEvent.click(playerButton);
    fireEvent.click(screen.getByText("Temporary player exclusions"));

    const exclusion = screen.getByRole("button", { name: "Arjun: avoid Dr. Copper" });
    fireEvent.click(exclusion);
    expect(exclusion.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Shuffle Characters" }));
    expect(screen.getByRole("alert").textContent).toContain("No valid assignment exists");

    fireEvent.click(playerButton);
    fireEvent.click(playerButton);
    expect(screen.getByRole("button", { name: "Arjun: avoid Dr. Copper" }).getAttribute("aria-pressed")).toBe("false");
  });
});
