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
      if (!match) return setError("Paste a valid BG Assistant group link.");
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
        <p className="eyebrow">Game night, minus the setup debate</p>
        <h1>Deal out the fun.<br /><span>Keep names private.</span></h1>
        <p className="hero__copy">
          Pick a game, choose who's playing, and make fair assignments in a few taps.
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
            <p className="eyebrow">{mode === "create" ? "New shared library" : "Open a shared library"}</p>
            <h2>{mode === "create" ? "Name your group" : "Paste the group link"}</h2>
          </div>
          <label>
            <span>{mode === "create" ? "Group name" : "BG Assistant link"}</span>
            <input
              autoFocus
              required
              maxLength={mode === "create" ? 80 : 500}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={mode === "create" ? "Friday Game Night" : "https://bg.arjunmakes.games/g/…"}
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
            <div><p className="eyebrow">Saved on this device</p><h2>Your groups</h2></div>
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
            <p className="eyebrow">A shared shelf, private players</p>
            <h2 id="how-it-works-heading">How it works</h2>
          </div>
        </div>
        <div className="info-grid">
          <article className="info-card">
            <span className="info-card__number" aria-hidden="true">01</span>
            <h3>Create a group</h3>
            <p>Name the group and add the games, assignment sets, options, and restrictions everyone should use.</p>
          </article>
          <article className="info-card">
            <span className="info-card__number" aria-hidden="true">02</span>
            <h3>Share one link</h3>
            <p>Anyone with the unguessable group link can open and edit the shared game library - no account required.</p>
          </article>
          <article className="info-card">
            <span className="info-card__number" aria-hidden="true">03</span>
            <h3>Play on your device</h3>
            <p>Add player names and make assignments locally. Names and named results are never sent to the shared library.</p>
          </article>
        </div>
      </section>

      <section className="section privacy-section" aria-labelledby="privacy-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Clear by design</p>
            <h2 id="privacy-heading">Privacy and storage</h2>
          </div>
        </div>
        <p className="privacy-intro">
          BG Assistant separates shared game information from personal game-night information. Here is where each kind of data lives.
        </p>
        <div className="storage-grid">
          <article className="storage-card">
            <p className="storage-card__location">Shared / Cloudflare D1</p>
            <h3>Game-library configuration</h3>
            <ul>
              <li>Group and game names</li>
              <li>Assignment sets, options, quantities, and banned pairs</li>
              <li>Revision and timestamp information used to prevent stale edits</li>
            </ul>
            <p>The secret part of a group link is stored server-side only as a SHA-256 hash.</p>
          </article>
          <article className="storage-card">
            <p className="storage-card__location">Private / This browser</p>
            <h3>Device-local information</h3>
            <ul>
              <li>Remembered group links</li>
              <li>Each group's player roster</li>
              <li>Cached copies of groups previously opened successfully</li>
            </ul>
            <p>This information is stored in your browser's IndexedDB and is not sent with shared game updates.</p>
          </article>
          <article className="storage-card">
            <p className="storage-card__location">Temporary / This session</p>
            <h3>Current setup</h3>
            <ul>
              <li>Selected players</li>
              <li>Temporary option exclusions</li>
              <li>Current assignment results</li>
            </ul>
            <p>These exist only while you use the current page and disappear when you leave or refresh it.</p>
          </article>
        </div>
        <aside className="privacy-callout" role="note">
          <div>
            <p className="eyebrow">Treat the link like a key</p>
            <h3>Anyone with a group link can view and edit that group.</h3>
          </div>
          <p>
            BG Assistant v1 has no accounts, owner recovery, group search, product analytics, or server-side player and assignment history.
          </p>
        </aside>
      </section>

      <section className="section game-tools-teaser">
        <p className="eyebrow">More ways to play</p>
        <h2>Game Tools</h2>
        <p className="muted">Purpose-built helpers for individual games will live here later.</p>
      </section>
    </Shell>
  );
}

