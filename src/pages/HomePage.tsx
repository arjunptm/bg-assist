import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../lib/api";
import { listKnownGroups, rememberGroup, type KnownGroup } from "../lib/storage";
import { Shell } from "../components/Shell";

export function HomePage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<KnownGroup[]>([]);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => void listKnownGroups().then(setGroups), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "join") {
      const match = value.trim().match(/\/g\/([A-Za-z0-9_-]{43})(?:\/|$)/);
      if (!match) return setError("Paste a valid Game Night group link.");
      navigate(`/g/${match[1]}`);
      return;
    }
    setBusy(true);
    try {
      const result = await createGroup(value);
      await rememberGroup({
        capability: result.capability,
        groupId: result.id,
        name: result.name,
        lastOpenedAt: new Date().toISOString()
      });
      navigate(`/g/${result.capability}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <section className="hero">
        <p className="eyebrow">Board-game role randomizer</p>
        <h1>Deal out the fun.<br /><span>Randomize every role.</span></h1>
        <p className="hero__copy">
          Set up roles, teams, colors, characters, starting positions, or anything else your game assigns. Then deal everything out in a few taps.
        </p>
        <div className="hero__actions">
          <button className="button button--primary" onClick={() => { setMode("create"); setValue(""); }}>
            Create a group
          </button>
          <button className="button button--secondary" onClick={() => { setMode("join"); setValue(""); }}>
            Join a group
          </button>
        </div>
      </section>

      {mode !== "none" && (
        <form className="card inline-form" onSubmit={(event) => void submit(event)}>
          <div>
            <p className="eyebrow">{mode === "create" ? "New game-night group" : "Join a game-night group"}</p>
            <h2>{mode === "create" ? "Name your group" : "Paste the group link"}</h2>
          </div>
          <label>
            <span>{mode === "create" ? "Group name" : "Game Night link"}</span>
            <input
              autoFocus
              required
              maxLength={mode === "create" ? 80 : 500}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={mode === "create" ? "Friday Game Night" : "https://gamenight.ludicmethods.com/g/…"}
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="button-row">
            <button className="button button--primary" disabled={busy}>
              {busy ? "Creating…" : mode === "create" ? "Create group" : "Open group"}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setMode("none")}>Cancel</button>
          </div>
        </form>
      )}

      {groups.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div><p className="eyebrow">Recently opened</p><h2>Your groups</h2></div>
          </div>
          <div className="group-list">
            {groups.map((group) => (
              <button
                className="group-card"
                key={group.groupId}
                onClick={() => navigate(`/g/${group.capability}`)}
              >
                <span className="group-card__initial">{group.name.charAt(0).toUpperCase()}</span>
                <span><strong>{group.name}</strong><small>Open randomizer</small></span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section explainer" aria-labelledby="how-it-works-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Set it up once. Deal it out anytime.</p>
            <h2 id="how-it-works-heading">How it works</h2>
          </div>
        </div>
        <div className="info-grid">
          <article className="info-card">
            <div className="info-card__meta" aria-hidden="true">
              <span className="info-card__icon">⚙︎</span>
              <span className="info-card__number">01</span>
            </div>
            <h3>Configure your game</h3>
            <p>Add the roles, colors, teams, characters, starting positions, and restrictions your board game needs.</p>
          </article>
          <article className="info-card">
            <div className="info-card__meta" aria-hidden="true">
              <span className="info-card__icon">↗︎</span>
              <span className="info-card__number">02</span>
            </div>
            <h3>Bring your group</h3>
            <p>Share one link so everyone can use and update the same game configurations - no account required.</p>
          </article>
          <article className="info-card">
            <div className="info-card__meta" aria-hidden="true">
              <span className="info-card__icon">⚄</span>
              <span className="info-card__number">03</span>
            </div>
            <h3>Randomize assignments</h3>
            <p>Choose who's playing, then fairly deal out one or more sets of assignments in a few taps.</p>
          </article>
        </div>
      </section>

      <section className="section privacy-section" aria-labelledby="privacy-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Privacy, briefly</p>
            <h2 id="privacy-heading">Game setup is shared. Player details stay local.</h2>
          </div>
        </div>
        <p className="privacy-intro">
          Game Night stores group and game configurations so everyone with the link can use them. Player names and randomized results are not sent to the shared library.
        </p>
        <details className="privacy-details">
          <summary>See exactly what Game Night stores</summary>
          <div className="privacy-details__content">
            <article className="privacy-detail">
              <p className="storage-card__location">Shared with the group</p>
              <h3>Game configuration</h3>
              <p>Group and game names, assignment options, quantities, restrictions, revisions, and timestamps are stored in Cloudflare D1.</p>
              <p>Anyone with the group link can view and edit this information. The secret part of the link is stored server-side only as a SHA-256 hash.</p>
            </article>
            <article className="privacy-detail">
              <p className="storage-card__location">Kept on this device</p>
              <h3>Players and current results</h3>
              <p>Remembered links, cached groups, and each group's player roster stay in this browser. Current selections and assignment results last only for the current setup.</p>
              <p>There are no accounts, product analytics, public group search, or server-side player and assignment history.</p>
            </article>
          </div>
        </details>
      </section>

      <section className="section game-tools-teaser">
        <p className="eyebrow">More ways to play</p>
        <h2>Game Tools</h2>
        <p className="muted">Purpose-built helpers for individual games will live here later.</p>
      </section>
    </Shell>
  );
}
