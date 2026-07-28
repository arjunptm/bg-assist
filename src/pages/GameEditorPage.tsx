import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingCard, Shell } from "../components/Shell";
import { useGroup } from "../hooks/useGroup";
import { saveGame } from "../lib/api";
import { createUuid } from "../lib/uuid";
import type { AssignmentSet, GameDraft } from "../shared/models";

function freshSet(): AssignmentSet {
  return {
    id: createUuid(),
    name: "",
    options: [
      { id: createUuid(), name: "", quantity: 1 },
      { id: createUuid(), name: "", quantity: 1 }
    ]
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function GameEditorPage() {
  const { capability = "", gameId } = useParams();
  const navigate = useNavigate();
  const { group, loading, stale } = useGroup(capability);
  const existing = useMemo(() => group?.games.find((game) => game.id === gameId), [group, gameId]);
  const [draft, setDraft] = useState<GameDraft>(() => ({
    name: "",
    assignmentSets: [freshSet()],
    bannedCombinations: []
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setDraft({
        id: existing.id,
        name: existing.name,
        revision: existing.revision,
        assignmentSets: structuredClone(existing.assignmentSets),
        bannedCombinations: structuredClone(existing.bannedCombinations)
      });
    }
  }, [existing]);

  if (loading) return <Shell><LoadingCard /></Shell>;
  if (!group) return <Shell><div className="card error-card">This group could not be opened.</div></Shell>;
  const back = `/g/${capability}`;

  function updateSet(index: number, patch: Partial<AssignmentSet>) {
    setDraft((current) => ({
      ...current,
      assignmentSets: current.assignmentSets.map((set, position) =>
        position === index ? { ...set, ...patch } : set
      )
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (stale || !navigator.onLine) return setError("You're offline. Shared library changes require a connection.");
    setSaving(true);
    setError("");
    try {
      await saveGame(capability, draft);
      navigate(back);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this game.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell backTo={back}>
      <form className="editor" onSubmit={(event) => void submit(event)}>
        <section className="page-title">
          <p className="eyebrow">{existing ? "Edit shared game" : "Add to shared library"}</p>
          <h1>{existing ? existing.name : "New game"}</h1>
        </section>
        <section className="card form-section">
          <label>
            <span>Game name</span>
            <input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Scythe" />
          </label>
        </section>

        <div className="section-heading">
          <div><p className="eyebrow">What gets dealt?</p><h2>Assignment sets</h2></div>
          <button type="button" className="button button--secondary button--small" onClick={() => setDraft({ ...draft, assignmentSets: [...draft.assignmentSets, freshSet()] })}>+ Add set</button>
        </div>

        {draft.assignmentSets.map((set, setIndex) => (
          <section className="card set-editor" key={set.id}>
            <div className="set-editor__heading">
              <label>
                <span>Set name</span>
                <input required maxLength={60} value={set.name} onChange={(event) => updateSet(setIndex, { name: event.target.value })} placeholder="Factions" />
              </label>
              <div className="reorder-actions">
                <button type="button" className="icon-button" disabled={setIndex === 0} aria-label={`Move ${set.name || "set"} up`} onClick={() => setDraft({ ...draft, assignmentSets: moveItem(draft.assignmentSets, setIndex, setIndex - 1) })}>↑</button>
                <button type="button" className="icon-button" disabled={setIndex === draft.assignmentSets.length - 1} aria-label={`Move ${set.name || "set"} down`} onClick={() => setDraft({ ...draft, assignmentSets: moveItem(draft.assignmentSets, setIndex, setIndex + 1) })}>↓</button>
                {draft.assignmentSets.length > 1 && (
                  <button type="button" className="text-button danger" onClick={() => setDraft({ ...draft, assignmentSets: draft.assignmentSets.filter((_, index) => index !== setIndex), bannedCombinations: [] })}>Remove</button>
                )}
              </div>
            </div>
            <div className="option-list">
              {set.options.map((option, optionIndex) => (
                <div className="option-row" key={option.id}>
                  <label>
                    <span className="sr-only">Option {optionIndex + 1}</span>
                    <input required maxLength={80} value={option.name} onChange={(event) => updateSet(setIndex, { options: set.options.map((item, index) => index === optionIndex ? { ...item, name: event.target.value } : item) })} placeholder={`${set.name || "Option"} ${optionIndex + 1}`} />
                  </label>
                  <label className="quantity">
                    <span>Qty</span>
                    <input type="number" min="1" max="99" value={option.quantity} onChange={(event) => updateSet(setIndex, { options: set.options.map((item, index) => index === optionIndex ? { ...item, quantity: Number(event.target.value) } : item) })} />
                  </label>
                  <div className="option-actions">
                    <button type="button" className="mini-button" disabled={optionIndex === 0} aria-label={`Move ${option.name || "option"} up`} onClick={() => updateSet(setIndex, { options: moveItem(set.options, optionIndex, optionIndex - 1) })}>↑</button>
                    <button type="button" className="mini-button" disabled={optionIndex === set.options.length - 1} aria-label={`Move ${option.name || "option"} down`} onClick={() => updateSet(setIndex, { options: moveItem(set.options, optionIndex, optionIndex + 1) })}>↓</button>
                    <button type="button" className="mini-button danger" aria-label={`Remove ${option.name || "option"}`} onClick={() => updateSet(setIndex, { options: set.options.filter((_, index) => index !== optionIndex) })}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="text-button" onClick={() => updateSet(setIndex, { options: [...set.options, { id: createUuid(), name: "", quantity: 1 }] })}>+ Add {set.name ? set.name.replace(/s$/i, "").toLowerCase() : "option"}</button>
          </section>
        ))}

        {draft.assignmentSets.length >= 2 && (
          <RestrictionsEditor draft={draft} onChange={setDraft} />
        )}
        {error && <p className="error card" role="alert">{error}</p>}
        <div className="sticky-actions">
          <button className="button button--primary button--full" disabled={saving}>{saving ? "Saving…" : "Save game"}</button>
        </div>
      </form>
    </Shell>
  );
}

function RestrictionsEditor({ draft, onChange }: { draft: GameDraft; onChange: (draft: GameDraft) => void }) {
  const [setA, setSetA] = useState(draft.assignmentSets[0]!.id);
  const [setB, setSetB] = useState(draft.assignmentSets[1]!.id);
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const first = draft.assignmentSets.find((set) => set.id === setA)!;
  const second = draft.assignmentSets.find((set) => set.id === setB)!;
  const optionName = new Map(draft.assignmentSets.flatMap((set) => set.options.map((option) => [option.id, option.name])));

  function addRestriction() {
    if (!optionA || !optionB) return;
    onChange({
      ...draft,
      bannedCombinations: [...draft.bannedCombinations, { id: createUuid(), optionAId: optionA, optionBId: optionB }]
    });
    setOptionA("");
    setOptionB("");
  }

  return (
    <section className="card form-section">
      <p className="eyebrow">Optional</p>
      <h2>Setup restrictions</h2>
      {draft.bannedCombinations.map((rule) => (
        <div className="restriction" key={rule.id}>
          <span>{optionName.get(rule.optionAId)} + {optionName.get(rule.optionBId)}</span>
          <button type="button" className="icon-button danger" aria-label="Remove restriction" onClick={() => onChange({ ...draft, bannedCombinations: draft.bannedCombinations.filter((item) => item.id !== rule.id) })}>×</button>
        </div>
      ))}
      <div className="restriction-builder">
        <select value={setA} onChange={(event) => { setSetA(event.target.value); setOptionA(""); }}>
          {draft.assignmentSets.filter((set) => set.id !== setB).map((set) => <option key={set.id} value={set.id}>{set.name || "Unnamed set"}</option>)}
        </select>
        <select value={optionA} onChange={(event) => setOptionA(event.target.value)}>
          <option value="">Choose option…</option>
          {first.options.map((option) => <option key={option.id} value={option.id}>{option.name || "Unnamed option"}</option>)}
        </select>
        <span className="restriction-plus">+</span>
        <select value={setB} onChange={(event) => { setSetB(event.target.value); setOptionB(""); }}>
          {draft.assignmentSets.filter((set) => set.id !== setA).map((set) => <option key={set.id} value={set.id}>{set.name || "Unnamed set"}</option>)}
        </select>
        <select value={optionB} onChange={(event) => setOptionB(event.target.value)}>
          <option value="">Choose option…</option>
          {second.options.map((option) => <option key={option.id} value={option.id}>{option.name || "Unnamed option"}</option>)}
        </select>
        <button type="button" className="button button--secondary" onClick={addRestriction}>Add banned pair</button>
      </div>
    </section>
  );
}
