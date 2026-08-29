import LoadingDots from './LoadingDots.jsx';

// Brief textarea + generate button. Controlled input — parent owns the value.
// While generating, the button shows an animated "Making..." with cycling dots
// so the 15–30s wait has visible feedback.
export default function BriefInput({ brief, onChange, onSubmit, disabled, generating }) {
  return (
    <div>
      <textarea
        className="brief-input"
        placeholder="e.g. smoky, citrusy, on the drier side"
        value={brief}
        onChange={(e) => onChange(e.target.value)}
        disabled={generating}
      />
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <button
          className="button"
          onClick={onSubmit}
          disabled={disabled || generating}
        >
          {generating ? <LoadingDots label="Making" /> : 'Make the drink'}
        </button>
      </div>
    </div>
  );
}