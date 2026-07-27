import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState, LoadingCard, Shell } from "../components/Shell";
import { ShareGroup } from "../components/ShareGroup";
import { deleteGame, restoreGame } from "../lib/api";
import { useGroup } from "../hooks/useGroup";
import type { Game } from "../shared/models";

export function GroupPage() {
  const { capability = "" } = useParams();
  const navigate = useNavigate();
  const { group, loading, stale, error, update } = useGroup(capability);
  const [deleted, setDeleted] = useState<Game>();
  const [notice, setNotice] = useState("");

  if (loading) return <Shell><LoadingCard /></Shell>;
  if (!group) return <Shell><div className="card error-card"><h1>Group unavailable</h1><p>{error}</p><Link to="/">Return home</Link></div></Shell>;

  const games = group.games.filter((game) => !game.deletedAt);

  async function remove(game: Game) {
    if (!navigator.onLine) return setNotice("You're offline. Shared library changes require a connection.");
    try {
      const snapshot = await deleteGame(capability, game.id, game.revision);
      await update(snapshot);
      setDeleted(snapshot.games.find((candidate) => candidate.id === game.id));
      setNotice(`${game.name} deleted.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete the game.");
    }
  }

  async function undo() {
    if (!deleted) return;
    try {
      const snapshot = await restoreGame(capability, deleted.id, deleted.revision);
      await update(snapshot);
      setDeleted(undefined);
      setNotice(`${deleted.name} restored.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not restore the game.");
    }
  }

  return (
    <Shell backTo="/">
      <section className="group-header">
        <div><p className="eyebrow">Randomizer</p><h1>{group.name}</h1></div>
        <div className="header-actions"><ShareGroup name={group.name} /></div>
      </section>
      {stale && <div className="offline-banner">Offline copy · Shared editing is unavailable</div>}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          {deleted && <button onClick={() => void undo()}>Undo</button>}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Shared library</p><h2>Choose a game</h2></div>
          <Link className="button button--secondary button--small" to={`/g/${capability}/games/new`}>+ Add game</Link>
        </div>
        {games.length === 0 ? (
          <EmptyState title="The shelf is empty">
            <p>Add a game and its assignment options to start shuffling.</p>
          </EmptyState>
        ) : (
          <div className="game-grid">
            {games.map((game, index) => (
              <article className={`game-card accent-${index % 4}`} key={game.id}>
                <button className="game-card__main" onClick={() => navigate(`/g/${capability}/games/${game.id}/setup`)}>
                  <span className="game-card__number">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{game.name}</strong>
                    <small>{game.assignmentSets.length} assignment {game.assignmentSets.length === 1 ? "set" : "sets"}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
                <div className="game-card__actions">
                  <Link to={`/g/${capability}/games/${game.id}/edit`}>Edit</Link>
                  <button onClick={() => void remove(game)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

