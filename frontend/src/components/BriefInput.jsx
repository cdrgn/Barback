// Brief textarea + generate button. Controlled input — parent owns the value.
// Disabled if there's no template chosen or the brief is empty, and while
// generation is in-flight so the host can't double-submit.
export default function BriefInput({ brief, onChange, onSubmit, disabled, generating }) {
  return (
    <div>
      <p className="section-label">What would they like?</p>
      <textarea
        className="brief-input"
        placeholder="e.g. smoky, citrusy, on the drier side"
        value={brief}
        onChange={(e) => onChange(e.target.value)}
      />
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <button
          className="button"
          onClick={onSubmit}
          disabled={disabled || generating}
        >
          {generating ? 'Making it…' : 'Make the drink'}
        </button>
      </div>
    </div>
  );
}