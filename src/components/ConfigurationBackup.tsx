import { useRef, useState, type ChangeEvent } from "react";
import { saveGame } from "../lib/api";
import {
  ConfigurationBackupError,
  createImportedDrafts,
  parseConfigurationBackup,
  serializeConfigurationBackup
} from "../lib/configuration-backup";
import type { Game, GameDraft, GroupSnapshot } from "../shared/models";

interface ImportPreview {
  fileName: string;
  originalNames: string[];
  drafts: GameDraft[];
}

export function ConfigurationBackup({
  capability,
  group,
  games,
  stale,
  update
}: {
  capability: string;
  group: GroupSnapshot;
  games: Game[];
  stale: boolean;
  update: (snapshot: GroupSnapshot) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  function exportGames(selectedGames: Game[], label: string) {
    setError("");
    setMessage("");
    try {
      const blob = new Blob([serializeConfigurationBackup(selectedGames)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFileName(label)}-game-night.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(
        `${selectedGames.length === 1 ? selectedGames[0]!.name : `${selectedGames.length} games`} exported without the group link or player data.`
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the backup.");
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    setPreview(undefined);
    try {
      const backup = parseConfigurationBackup(await file.text());
      const drafts = createImportedDrafts(
        backup,
        group.games.filter((game) => !game.deletedAt).map((game) => game.name)
      );
      setPreview({
        fileName: file.name,
        originalNames: backup.games.map((game) => game.name),
        drafts
      });
    } catch (caught) {
      setError(
        caught instanceof ConfigurationBackupError
          ? caught.message
          : "This backup could not be read."
      );
    }
  }

  async function importGames() {
    if (!preview) return;
    if (stale || !navigator.onLine) {
      setError("You're offline. Importing into the shared library requires a connection.");
      return;
    }
    setImporting(true);
    setError("");
    setMessage("");
    let imported = 0;
    try {
      for (const draft of preview.drafts) {
        const snapshot = await saveGame(capability, draft);
        await update(snapshot);
        imported += 1;
      }
      setMessage(
        `${imported} ${imported === 1 ? "game" : "games"} imported as ${
          imported === 1 ? "a new copy" : "new copies"
        }.`
      );
      setPreview(undefined);
    } catch (caught) {
      setError(
        `${imported} of ${preview.drafts.length} games were imported before the operation stopped. ${
          caught instanceof Error ? caught.message : "The remaining games could not be imported."
        }`
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="section configuration-backup" aria-labelledby="configuration-backup-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portable recovery</p>
          <h2 id="configuration-backup-title">Back up game configurations</h2>
        </div>
      </div>
      <div className="card configuration-backup__card">
        <p>
          Export files contain game setup only. They never contain this group link,
          player names, selections, assignments, or cached device data.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={games.length === 0}
            onClick={() => exportGames(games, group.name)}
          >
            Export all games
          </button>
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => inputRef.current?.click()}
          >
            Import backup
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            aria-label="Choose a Game Night configuration backup"
            onChange={(event) => void chooseFile(event)}
          />
        </div>
        {games.length > 0 && (
          <details className="configuration-backup__individual">
            <summary>Export one game</summary>
            <div className="configuration-backup__game-list">
              {games.map((game) => (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  key={game.id}
                  onClick={() => exportGames([game], game.name)}
                >
                  Export {game.name}
                </button>
              ))}
            </div>
          </details>
        )}
        <p className="fine-print">
          Importing creates new copies in this group. It does not recover or change
          the original group identity or capability link.
        </p>
        {preview && (
          <div className="configuration-backup__preview" role="region" aria-labelledby="import-preview-title">
            <div>
              <h3 id="import-preview-title">Review import</h3>
              <p className="fine-print">{preview.fileName}</p>
              <p className="fine-print">
                Each listed game will be saved as a new shared copy. If the
                connection stops partway through, completed copies remain.
              </p>
              <ul>
                {preview.drafts.map((draft, index) => (
                  <li key={`${draft.name}-${index}`}>
                    <strong>{draft.name}</strong>
                    {draft.name !== preview.originalNames[index] && (
                      <span> renamed from {preview.originalNames[index]}</span>
                    )}
                    <small>
                      {draft.assignmentSets.length} sets ·{" "}
                      {draft.assignmentSets.reduce((count, set) => count + set.options.length, 0)} options
                    </small>
                  </li>
                ))}
              </ul>
            </div>
            <div className="inline-confirmation__actions">
              <button
                type="button"
                className="button button--secondary button--small"
                disabled={importing}
                onClick={() => setPreview(undefined)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--primary button--small"
                disabled={importing}
                onClick={() => void importGames()}
              >
                {importing ? "Importing…" : `Import ${preview.drafts.length} ${preview.drafts.length === 1 ? "game" : "games"}`}
              </button>
            </div>
          </div>
        )}
        {message && <p className="setup-feedback card" role="status">{message}</p>}
        {error && <p className="error card" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase();
  return normalized || "games";
}
