// The "what would you change?" input shown when refining a poured drink.
// Controlled input — parent owns the value. Mirrors BriefInput but worded for
// a correction rather than a fresh brief.
export default function CorrectionInput({ correction, onChange, onSubmit, onCancel, refining }) {
  return (
    <div>
      <p className="section-label">What would you change?</p>
      <textarea
        className="brief-input"
        placeholder="e.g. too sweet, a little more lime"
        value={correction}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="stack" style={{ marginTop: 'var(--sp-3)' }}>
        <button
          className="button"
          onClick={onSubmit}
          disabled={!correction.trim() || refining}
        >
          {refining ? 'Refining…' : 'Refine it'}
        </button>
        <button className="button secondary" onClick={onCancel} disabled={refining}>
          Cancel
        </button>
      </div>
    </div>
  );
}