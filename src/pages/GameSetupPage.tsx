import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingCard, Shell } from "../components/Shell";
import { useGroup } from "../hooks/useGroup";
import { getRoster, setRoster } from "../lib/storage";
import { assignSet, RandomizerError, type AssignmentMap } from "../lib/randomizer";

type PlayerExclusions = Record<string, Record<string, Set<string>>>;

const ROSTER_FILTER_THRESHOLD = 8;
const playerNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const comparePlayerNames = (left: string, right: string) =>
  playerNameCollator.compare(left, right) || left.localeCompare(right);

export function GameSetupPage() {
  const { capability = "", gameId = "" } = useParams();
  const { group, loading, stale } = useGroup(capability);
  const game = useMemo(() => group?.games.find((candidate) => candidate.id === gameId), [group, gameId]);
  const [roster, updateRoster] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [enabled, setEnabled] = useState<Record<string, Set<string>>>({});
  const [assignments, setAssignments] = useState<Record<string, AssignmentMap>>({});
  const [exclusions, setExclusions] = useState<PlayerExclusions>({});
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);
  const [confirmingClearPlayers, setConfirmingClearPlayers] = useState(false);
  const clearPlayersButtonRef = useRef<HTMLButtonElement>(null);
  const sortedRoster = useMemo(() => [...roster].sort(comparePlayerNames), [roster]);
  const normalizedFilter = playerFilter.trim().toLocaleLowerCase();
  const visibleRoster = normalizedFilter
    ? sortedRoster.filter((player) => player.toLocaleLowerCase().includes(normalizedFilter))
    : sortedRoster;

  useEffect(() => {
    if (group) void getRoster(group.id).then(updateRoster);
  }, [group?.id]);
  useEffect(() => {
    if (game) {
      setEnabled(Object.fromEntries(game.assignmentSets.map((set) => [set.id, new Set(set.options.map((option) => option.id))])));
      setAssignments({});
      setExclusions({});
      setError("");
      setFeedback("");
    }
  }, [game]);

  if (loading) return <Shell><LoadingCard /></Shell>;
  if (!group || !game) return <Shell><div className="card error-card">This game could not be opened.</div></Shell>;
  const activeGroup = group;
  const activeGame = game;
  const back = `/g/${capability}`;
  const playerIds = [...selected];
  const optionById = new Map(game.assignmentSets.flatMap((set) => set.options.map((option) => [option.id, option] as const)));

  async function addPlayer(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || roster.some((player) => player.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    const next = [...roster, name];
    updateRoster(next);
    setSelected(new Set([...selected, name]));
    setNewName("");
    setAssignments({});
    setError("");
    setFeedback("");
    await setRoster(activeGroup.id, next);
  }

  async function clearPlayers() {
    updateRoster([]);
    setSelected(new Set());
    setPlayerFilter("");
    setAssignments({});
    setExclusions({});
    setError("");
    setFeedback("");
    setConfirmingClearPlayers(false);
    await setRoster(activeGroup.id, []);
  }

  function cancelClearPlayers() {
    setConfirmingClearPlayers(false);
    requestAnimationFrame(() => clearPlayersButtonRef.current?.focus());
  }

  function togglePlayer(player: string) {
    const active = selected.has(player);
    const nextSelected = new Set(selected);
    active ? nextSelected.delete(player) : nextSelected.add(player);
    setSelected(nextSelected);
    if (active) {
      const nextExclusions: PlayerExclusions = {};
      for (const [setId, byPlayer] of Object.entries(exclusions)) {
        const remaining = { ...byPlayer };
        delete remaining[player];
        nextExclusions[setId] = remaining;
      }
      setExclusions(nextExclusions);
    }
    setAssignments({});
    setError("");
    setFeedback("");
  }

  function toggleOption(setId: string, optionId: string) {
    const nextEnabled = new Set(enabled[setId] ?? []);
    const active = nextEnabled.has(optionId);
    active ? nextEnabled.delete(optionId) : nextEnabled.add(optionId);
    setEnabled({ ...enabled, [setId]: nextEnabled });
    if (active) {
      const reconciled: Record<string, Set<string>> = {};
      for (const [player, optionIds] of Object.entries(exclusions[setId] ?? {})) {
        const nextOptionIds = new Set(optionIds);
        nextOptionIds.delete(optionId);
        reconciled[player] = nextOptionIds;
      }
      setExclusions({ ...exclusions, [setId]: reconciled });
    }
    setAssignments({});
    setError("");
    setFeedback("");
  }

  function toggleExclusion(setId: string, player: string, optionId: string) {
    const byPlayer = exclusions[setId] ?? {};
    const nextOptionIds = new Set(byPlayer[player] ?? []);
    nextOptionIds.has(optionId) ? nextOptionIds.delete(optionId) : nextOptionIds.add(optionId);
    setExclusions({ ...exclusions, [setId]: { ...byPlayer, [player]: nextOptionIds } });
    setAssignments({});
    setError("");
    setFeedback("");
  }

  function startOver() {
    setAssignments({});
    setError("");
    setFeedback("Assignments cleared. Your players, available options, and temporary exclusions are unchanged.");
    setConfirmingStartOver(false);
  }

  function shuffle(setId: string) {
    setError("");
    setFeedback("");
    setConfirmingStartOver(false);
    const set = activeGame.assignmentSets.find((candidate) => candidate.id === setId)!;
    try {
      const fixed = Object.fromEntries(Object.entries(assignments).filter(([key]) => key !== setId));
      const result = assignSet({
        playerIds,
        options: set.options,
        enabledOptionIds: enabled[setId] ?? new Set(),
        fixedAssignments: fixed,
        bannedCombinations: activeGame.bannedCombinations,
        playerExclusions: exclusions[setId] ?? {},
        avoidAssignment: assignments[setId]
      });
      setAssignments({ ...assignments, [setId]: result });
    } catch (caught) {
      if (caught instanceof RandomizerError && caught.code === "NO_ALTERNATIVE_ASSIGNMENT") {
        setFeedback(caught.message);
      } else {
        setError(caught instanceof RandomizerError ? caught.message : "Could not create an assignment.");
      }
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
          {roster.length > 0 && (
            <button
              ref={clearPlayersButtonRef}
              className="text-button danger"
              onClick={() => setConfirmingClearPlayers(true)}
            >
              Clear players
            </button>
          )}
        </div>
        {confirmingClearPlayers && (
          <div className="card inline-confirmation" role="region" aria-labelledby="clear-players-title">
            <div>
              <h3 id="clear-players-title">Clear remembered players?</h3>
              <p>This removes player names saved on this device for this group. It does not change the shared game library.</p>
            </div>
            <div className="inline-confirmation__actions">
              <button type="button" className="button button--secondary button--small" autoFocus onClick={cancelClearPlayers}>Cancel</button>
              <button type="button" className="button button--secondary button--small danger" onClick={() => void clearPlayers()}>Clear players</button>
            </div>
          </div>
        )}
        {roster.length > ROSTER_FILTER_THRESHOLD && (
          <label className="roster-filter">
            Filter players
            <input
              type="search"
              value={playerFilter}
              onChange={(event) => setPlayerFilter(event.target.value)}
              placeholder="Search remembered names"
            />
          </label>
        )}
        <div className="player-grid" role="group" aria-label="Remembered players">
          {visibleRoster.map((player) => {
            const active = selected.has(player);
            return (
              <button
                type="button"
                className={`player-chip ${active ? "is-selected" : ""}`}
                aria-pressed={active}
                key={player}
                onClick={() => togglePlayer(player)}
              >
                <span className="check">{active ? "✓" : ""}</span>{player}
              </button>
            );
          })}
        </div>
        {normalizedFilter && visibleRoster.length === 0 && <p className="hint roster-empty">No remembered players match that search.</p>}
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
        {game.assignmentSets.map((set) => {
          const exclusionCount = Object.values(exclusions[set.id] ?? {}).reduce(
            (total, optionIds) => total + optionIds.size,
            0
          );
          const enabledOptions = set.options.filter((option) => enabled[set.id]?.has(option.id));
          return (
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
                      type="button"
                      key={option.id}
                      className={`option-toggle ${active ? "is-enabled" : ""} ${option.color ? "has-option-color" : ""}`}
                      style={option.color ? { "--option-color": option.color } as CSSProperties : undefined}
                      aria-pressed={active}
                      onClick={() => toggleOption(set.id, option.id)}
                    >
                      {option.color && (
                        <>
                          <span className="option-color-swatch" aria-hidden="true" />
                          <span className="sr-only">Color: {option.color}. </span>
                        </>
                      )}
                      <span>{active ? "✓" : "○"}</span>{option.name}{option.quantity > 1 ? ` ×${option.quantity}` : ""}
                      {option.description && <small>{option.description}</small>}
                    </button>
                  );
                })}
              </div>
            </details>
            {selected.size > 0 && (
              <details className="exclusion-panel">
                <summary>
                  Temporary player exclusions
                  {exclusionCount > 0 ? ` (${exclusionCount})` : ""}
                </summary>
                <p className="hint">Optionally keep a player from receiving something in this set. These choices last only for this setup.</p>
                <div className="exclusion-list">
                  {playerIds.map((player) => (
                    <fieldset className="exclusion-player" key={player}>
                      <legend>{player}</legend>
                      <div className="exclusion-options">
                        {enabledOptions.map((option) => {
                          const excluded = exclusions[set.id]?.[player]?.has(option.id) ?? false;
                          return (
                            <button
                              type="button"
                              className={`exclusion-toggle ${excluded ? "is-excluded" : ""}`}
                              aria-label={`${player}: ${excluded ? "allow" : "avoid"} ${option.name}`}
                              aria-pressed={excluded}
                              key={option.id}
                              onClick={() => toggleExclusion(set.id, player, option.id)}
                            >
                              <span aria-hidden="true">{excluded ? "X" : "+"}</span>{option.name}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </details>
            )}
            </article>
          );
        })}
        {selected.size === 0 && <p className="hint">Select at least one player to shuffle.</p>}
        {error && <p className="error card" role="alert">{error}</p>}
        {feedback && <p className="setup-feedback card" role="status">{feedback}</p>}
      </section>

      {Object.keys(assignments).length > 0 && (
        <section className="section assignments">
          <div className="assignments__heading">
            <div><p className="eyebrow">Current setup</p><h2>Assignments</h2></div>
            <button type="button" className="button button--secondary button--small" onClick={() => setConfirmingStartOver(true)}>Start over</button>
          </div>
          {confirmingStartOver && (
            <div className="card inline-confirmation" role="region" aria-labelledby="start-over-title">
              <div>
                <h3 id="start-over-title">Clear current assignments?</h3>
                <p>Your selected players, available options, and temporary exclusions will stay in place.</p>
              </div>
              <div className="inline-confirmation__actions">
                <button type="button" className="button button--secondary button--small" autoFocus onClick={() => setConfirmingStartOver(false)}>Cancel</button>
                <button type="button" className="button button--secondary button--small danger" onClick={startOver}>Clear assignments</button>
              </div>
            </div>
          )}
          <div className="assignment-list">
            {playerIds.map((player) => (
              <article className="assignment-card" key={player}>
                <h3>{player}</h3>
                <dl>
                  {game.assignmentSets.map((set) => {
                    const option = optionById.get(assignments[set.id]?.[player] ?? "");
                    return option ? (
                      <div key={set.id}>
                        <dt>{set.name}</dt>
                        <dd style={option.color ? { "--option-color": option.color } as CSSProperties : undefined}>
                          <strong>
                            {option.color && (
                              <>
                                <span className="option-color-swatch" aria-hidden="true" />
                                <span className="sr-only">Color: {option.color}. </span>
                              </>
                            )}
                            {option.name}
                          </strong>
                          {option.description && <small>{option.description}</small>}
                        </dd>
                      </div>
                    ) : null;
                  })}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
