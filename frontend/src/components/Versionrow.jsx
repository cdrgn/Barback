// One version in a lineage. Collapsed, it's a summary row (version label, the
// correction that produced it, a ★ if final). Expanded, it shows the full recipe.
// The parent (LineageView) owns which rows are open.
export default function VersionRow({ version, index, isFinal, expanded, onToggle }) {
  const label = index === 0 ? 'Original' : `v${index + 1}`;

  return (
    <div className={`version-row ${expanded ? 'expanded' : ''}`}>
      <button className="version-summary" onClick={onToggle}>
        <span className="version-label">
          {label}
          {isFinal && <span className="version-star"> ★ final</span>}
        </span>
        {/* the correction that produced THIS version — the convergence story */}
        {version.correction && (
          <span className="version-correction">"{version.correction}"</span>
        )}
        <span className="version-caret">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="version-body">
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

          {version.garnish && (
            <p className="recipe-body"><strong>Garnish:</strong> {version.garnish}</p>
          )}
          {version.steps && <p className="recipe-body">{version.steps}</p>}

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