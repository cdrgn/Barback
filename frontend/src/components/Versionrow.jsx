// One version in a lineage. Collapsed = summary row (label, the note the host
// made ABOUT this version, ★ if favorite). Expanded = the full recipe, rendered
// the same way as the Make view for visual consistency.
//
// `noteAboutThis` is the correction the host gave about THIS version (which
// motivated the next one) — passed down from LineageView, which shifts each
// child's stored correction onto its parent so the story reads: this version →
// "what was wrong with it" → next version.
export default function VersionRow({ version, index, isFinal, noteAboutThis, expanded, onToggle }) {
  const label = index === 0 ? 'Original' : `v${index + 1}`;

  return (
    <div className={`version-row ${expanded ? 'expanded' : ''}`}>
      <button className="version-summary" onClick={onToggle}>
        <span className="version-label">
          {label}
          {isFinal && <span className="version-star"> ★ favorite</span>}
        </span>
        {noteAboutThis && (
          <span className="version-correction">"{noteAboutThis}"</span>
        )}
        <span className="version-caret">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="version-body">
          <section className="recipe-section">
            <p className="section-label">Ingredients</p>
            <ul className="recipe-ingredients">
              {version.ingredients.map((i, idx) => (
                <li key={idx}>
                  <span>{i.name}</span>
                  <span className="recipe-ingredient-amount">
                    {formatAmount(i.amount)} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {version.garnish && (
            <section className="recipe-section">
              <p className="section-label">Garnish</p>
              <p className="recipe-body">{version.garnish}</p>
            </section>
          )}

          {version.steps && (
            <section className="recipe-section">
              <p className="section-label">Instructions</p>
              <p className="recipe-body">{version.steps}</p>
            </section>
          )}

          <div className="recipe-footer">
            <span className="recipe-footer-facts">
              {version.abv != null && <span>ABV ~{version.abv}%</span>}
              {version.method && <span>{version.method}</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}