// One version in a lineage. Collapsed = summary row (label, the version's own
// origin note, ★ if favorite). Expanded = the full recipe, rendered the same
// way as the Make view for visual consistency.
//
// Origin note = how THIS version came to be:
//   - root (index 0): the brief the host first asked for (`requested`)
//   - refinement:     the correction that produced it (`correction`)
export default function VersionRow({ version, index, isFinal, expanded, onToggle }) {
  const label = index === 0 ? 'Original' : `v${index + 1}`;
  const note = index === 0 ? version.requested : version.correction;

  return (
    <div className={`version-row ${expanded ? 'expanded' : ''}`}>
      <button className="version-summary" onClick={onToggle}>
        <span className="version-label">
          {label}
          {isFinal && <span className="version-star"> ★ favorite</span>}
        </span>
        {note && (
          <span className="version-correction">"{note}"</span>
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