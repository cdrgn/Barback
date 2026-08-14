// Grid of the 6 template cards. Controlled by parent — parent owns the
// selected template and passes an onSelect callback.
export default function TemplatePicker({ templates, selectedName, onSelect }) {
  if (!templates.length) {
    console.log("If templates don't load, check if DB has been seeded.");
    return <p className="section-label">Loading templates...</p>; 
}

  return (
    <div>
      <p className="section-label">Choose a template</p>
      <div className="template-grid">
        {templates.map((t) => (
          <button
            key={t.name}
            className={`template-card ${selectedName === t.name ? 'selected' : ''}`}
            onClick={() => onSelect(t)}
          >
            <div className="template-card-name">{t.display_name}</div>
            <div className="template-card-method">{t.default_method}</div>
          </button>
        ))}
      </div>
    </div>
  );
}