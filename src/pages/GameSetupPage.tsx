import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingCard, Shell } from "../components/Shell";
import { useGroup } from "../hooks/useGroup";
import { getRoster, setRoster } from "../lib/storage";
import { assignSet, RandomizerError, type AssignmentMap } from "../lib/randomizer";

export function GameSetupPage() {
  const { capability = "", gameId = "" } = useParams();
  const { group, loading, stale } = useGroup(capability);
  const game = useMemo(() => group?.games.find((candidate) => candidate.id === gameId), [group, gameId]);
  const [roster, updateRoster] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [enabled, setEnabled] = useState<Record<string, Set<string>>>({});
  const [assignments, setAssignments] = useState<Record<string, AssignmentMap>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (group) void getRoster(group.id).then(updateRoster);
  }, [group]);
  useEffect(() => {
    if (game) {
      setEnabled(Object.fromEntries(game.assignmentSets.map((set) => [set.id, new Set(set.options.map((option) => option.id))])));
    }
  }, [game]);

  if (loading) return <Shell><LoadingCard /></Shell>;
  if (!group || !game) return <Shell><div className="card error-card">This game could not be opened.</div></Shell>;
  const activeGroup = group;
  const activeGame = game;
  const back = `/g/${capability}`;
  const playerIds = [...selected];
  const optionNames = new Map(game.assignmentSets.flatMap((set) => set.options.map((option) => [option.id, option.name])));

  async function addPlayer(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || roster.some((player) => player.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    const next = [...roster, name];
    updateRoster(next);
    setSelected(new Set([...selected, name]));
    setNewName("");
    await setRoster(activeGroup.id, next);
  }

  async function clearPlayers() {
    if (!window.confirm("Clear all locally remembered player names for this group?")) return;
    updateRoster([]);
    setSelected(new Set());
    setAssignments({});
    await setRoster(activeGroup.id, []);
  }

  function shuffle(setId: string) {
    setError("");
    const set = activeGame.assignmentSets.find((candidate) => candidate.id === setId)!;
    try {
      const fixed = Object.fromEntries(Object.entries(assignments).filter(([key]) => key !== setId));
      const result = assignSet({
        playerIds,
        options: set.options,
        enabledOptionIds: enabled[setId] ?? new Set(),
        fixedAssignments: fixed,
        bannedCombinations: activeGame.bannedCombinations
      });
      setAssignments({ ...assignments, [setId]: result });
    } catch (caught) {
      setError(caught instanceof RandomizerError ? caught.message : "Could not create an assignment.");
    }
  }

  return (
    <Shell backTo={back}>
      <section className="setup-heading">
        <div><p className="eyebrow">Game setup</p><h1>{game.name}</h1></div>
        <Link className="button button--ghost button--small" to={`/g/${capability}/games/${game.id}/edit`}>Edit game</Link>
      </section>
      {stale && <div className="offline-banner">Offline copy · Randomizing still works</div>}

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Step one</p><h2>Who's playing?</h2></div>
          {roster.length > 0 && <button className="text-button danger" onClick={() => void clearPlayers()}>Clear players</button>}
        </div>
        <div className="player-grid">
          {roster.map((player) => {
            const active = selected.has(player);
            return (
              <button
                className={`player-chip ${active ? "is-selected" : ""}`}
                aria-pressed={active}
                key={player}
                onClick={() => {
                  const next = new Set(selected);
                  active ? next.delete(player) : next.add(player);
                  setSelected(next);
                  setAssignments({});
                }}
              >
                <span className="check">{active ? "✓" : ""}</span>{player}
              </button>
            );
          })}
        </div>
        <form className="add-player" onSubmit={(event) => void addPlayer(event)}>
          <input aria-label="Player name" maxLength={60} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Add a player name" />
          <button className="button button--secondary">Add</button>
        </form>
        <p className="privacy-note">Player names stay on this device and are never sent to the shared library.</p>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Step two</p><h2>Shuffle a set</h2></div>
        </div>
        {game.assignmentSets.map((set) => (
          <article className="card shuffle-card" key={set.id}>
            <div className="shuffle-card__heading">
              <div>
                <h3>{set.name}</h3>
                <p className="muted">{assignments[set.id] ? "✓ Assigned" : `${set.options.length} options`}</p>
              </div>
              <button className="button button--primary button--small" disabled={selected.size === 0} onClick={() => shuffle(set.id)}>
                {assignments[set.id] ? `Re-shuffle ${set.name}` : `Shuffle ${set.name}`}
              </button>
            </div>
            <details>
              <summary>Available options</summary>
              <div className="option-toggles">
                {set.options.map((option) => {
                  const active = enabled[set.id]?.has(option.id) ?? false;
                  return (
                    <button
                      key={option.id}
                      className={`option-toggle ${active ? "is-enabled" : ""}`}
                      aria-pressed={active}
                      onClick={() => {
                        const next = new Set(enabled[set.id]);
                        active ? next.delete(option.id) : next.add(option.id);
                        setEnabled({ ...enabled, [set.id]: next });
                      }}
                    >
                      <span>{active ? "✓" : "○"}</span>{option.name}{option.quantity > 1 ? ` ×${option.quantity}` : ""}
                    </button>
                  );
                })}
              </div>
            </details>
          </article>
        ))}
        {selected.size === 0 && <p className="hint">Select at least one player to shuffle.</p>}
        {error && <p className="error card" role="alert">{error}</p>}
      </section>

      {Object.keys(assignments).length > 0 && (
        <section className="section assignments">
          <p className="eyebrow">Current setup</p>
          <h2>Assignments</h2>
          <div className="assignment-list">
            {playerIds.map((player) => (
              <article className="assignment-card" key={player}>
                <h3>{player}</h3>
                <dl>
                  {game.assignmentSets.map((set) => assignments[set.id]?.[player] && (
                    <div key={set.id}><dt>{set.name}</dt><dd>{optionNames.get(assignments[set.id]![player]!)}</dd></div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
