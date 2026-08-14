// Grid of the 6 template cards. Shows each template's host-facing description
// (short, plain-language) so a novice can browse and pick without bar jargon.
export default function TemplatePicker({ templates, selectedName, onSelect }) {
  if (!templates.length) {
    console.log("If templates don't load, check if DB has been seeded.");
    return <p className="section-label">Loading templates...</p>; 
}

  return (
    <div>
      <p className="section-label">Choose a classic to make</p>
      <div className="template-grid">
        {templates.map((t) => (
          <button
            key={t.name}
            className={`template-card ${selectedName === t.name ? 'selected' : ''}`}
            onClick={() => onSelect(t)}
          >
            <div className="template-card-name">{t.display_name}</div>
            <div className="template-card-notes">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}