// Grid of the 6 template cards. Shows the template's notes (flavor description)
// rather than the prep method — the notes actually help a novice pick.
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
            <div className="template-card-notes">{t.notes}</div>
          </button>
        ))}
      </div>
    </div>
  );
}