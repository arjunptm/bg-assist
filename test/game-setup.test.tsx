import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GameSetupPage } from "../src/pages/GameSetupPage";

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
  const roster = ["Arjun"];
  return {
    getRoster: vi.fn(async () => roster),
    setRoster: vi.fn()
  };
});

describe("assignment option descriptions", () => {
  it("shows the description beneath an assigned option", async () => {
    render(
      <MemoryRouter initialEntries={["/g/capability/games/game-id/setup"]}>
        <Routes>
          <Route
            path="/g/:capability/games/:gameId/setup"
            element={<GameSetupPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /Arjun/ }));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle Characters" }));

    const resultCard = (await screen.findByRole("heading", { name: "Arjun" })).closest("article");
    expect(resultCard).toBeTruthy();
    expect(within(resultCard!).getByText("Dr. Copper")).toBeTruthy();
    expect(within(resultCard!).getByText("Look at another character's card.")).toBeTruthy();
  });
});
