import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigurationBackup } from "../src/components/ConfigurationBackup";
import { createConfigurationBackup } from "../src/lib/configuration-backup";
import { saveGame } from "../src/lib/api";
import type { Game, GroupSnapshot } from "../src/shared/models";

vi.mock("../src/lib/api", () => ({
  saveGame: vi.fn()
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const game: Game = {
  id: "10000000-0000-4000-8000-000000000000",
  name: "Scythe",
  revision: 1,
  assignmentSets: [
    {
      id: "20000000-0000-4000-8000-000000000000",
      name: "Factions",
      options: [
        {
          id: "30000000-0000-4000-8000-000000000000",
          name: "Rusviet",
          quantity: 1
        }
      ]
    }
  ],
  bannedCombinations: []
};

const group: GroupSnapshot = {
  id: "group-id",
  name: "Friday Games",
  revision: 1,
  fetchedAt: "2026-07-28T00:00:00.000Z",
  games: [game]
};

function renderBackup(stale = false) {
  const update = vi.fn(async () => undefined);
  render(
    <ConfigurationBackup
      capability="capability"
      group={group}
      games={[game]}
      stale={stale}
      update={update}
    />
  );
  return { update };
}

function chooseBackup(value: unknown, name = "games.json") {
  const input = screen.getByLabelText("Choose a BG Assistant configuration backup");
  fireEvent.change(input, {
    target: {
      files: [{
        name,
        text: async () => JSON.stringify(value)
      }]
    }
  });
}

describe("configuration backup UI", () => {
  it("previews renamed copies before importing and updates the cached snapshot", async () => {
    const backup = createConfigurationBackup([game]);
    const importedSnapshot = { ...group, revision: 2 };
    vi.mocked(saveGame).mockResolvedValue(importedSnapshot);
    const { update } = renderBackup();

    chooseBackup(backup, "scythe-backup.json");

    const preview = await screen.findByRole("region", { name: "Review import" });
    expect(within(preview).getByText("scythe-backup.json")).toBeTruthy();
    expect(within(preview).getByText("Scythe (imported)")).toBeTruthy();
    expect(within(preview).getByText(/renamed from Scythe/)).toBeTruthy();

    fireEvent.click(within(preview).getByRole("button", { name: "Import 1 game" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "1 game imported as a new copy"
    );
    expect(saveGame).toHaveBeenCalledOnce();
    const [calledCapability, importedDraft] = vi.mocked(saveGame).mock.calls[0]!;
    expect(calledCapability).toBe("capability");
    expect(importedDraft.name).toBe("Scythe (imported)");
    expect("id" in importedDraft).toBe(false);
    expect(update).toHaveBeenCalledWith(importedSnapshot);
  });

  it("blocks shared imports while offline without calling the API", async () => {
    renderBackup(true);
    chooseBackup(createConfigurationBackup([game]));
    const preview = await screen.findByRole("region", { name: "Review import" });

    fireEvent.click(within(preview).getByRole("button", { name: "Import 1 game" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Importing into the shared library requires a connection"
    );
    expect(saveGame).not.toHaveBeenCalled();
  });

  it("rejects private-data-bearing files before showing a preview", async () => {
    renderBackup();
    chooseBackup({
      ...createConfigurationBackup([game]),
      roster: ["Alice"]
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "contains player, session, group-link, or cache data"
    );
    expect(screen.queryByRole("region", { name: "Review import" })).toBeNull();
  });
});
