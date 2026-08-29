// Renders a recipe. Layout, top to bottom:
//   title
//   description (italic prose — always shown if present)
//   attribution box ("A custom [Family] — because..." — generated drinks only)
//   INGREDIENTS / GARNISH / INSTRUCTIONS sections
//   footer: ABV · method · attempts
//
// Actions at the bottom depend on the mode (driven by which callbacks are passed):
//   CLASSIC (read-only):  [Back]                       — nothing is saved
//   GENERATED (saved):    [★ Favorite] [Refine this drink] [Start over]
// Generated drinks are auto-saved when created, so there's no "pour" gate;
// Favorite is a toggle available any time (no "mark final in the moment" trap).
export default function RecipeView({
  recipe, attempts, pickedTemplate,
  onBack,                       // classic: return home
  onRefine, onStartOver,        // generated: iterate or abandon
  onToggleFavorite, isFavorite, // generated: the ★ toggle
  busy,
}) {
  return (
    <article className="recipe">
      <h2 className="recipe-name">{recipe.name}</h2>

      {recipe.description && (
        <p className="recipe-description">{recipe.description}</p>
      )}

      {pickedTemplate && (
        <p className="recipe-attribution">
          A custom <strong>{pickedTemplate.display_name}</strong>
          {pickedTemplate.reasoning && ` — ${pickedTemplate.reasoning}`}
        </p>
      )}

      <section className="recipe-section">
        <p className="section-label">Ingredients</p>
        <ul className="recipe-ingredients">
          {recipe.ingredients.map((i, idx) => (
            <li key={idx}>
              <span>{i.name}</span>
              <span className="recipe-ingredient-amount">
                {formatAmount(i.amount)} {i.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.garnish && (
        <section className="recipe-section">
          <p className="section-label">Garnish</p>
          <p className="recipe-body">{recipe.garnish}</p>
        </section>
      )}

      {recipe.steps && (
        <section className="recipe-section">
          <p className="section-label">Instructions</p>
          <p className="recipe-body">{recipe.steps}</p>
        </section>
      )}

      <div className="recipe-footer">
        <span className="recipe-footer-facts">
          {recipe.abv != null && <span>ABV ~{recipe.abv}%</span>}
          {recipe.method && <span>{recipe.method}</span>}
          {attempts != null && <span>{attempts} attempt{attempts === 1 ? '' : 's'}</span>}
        </span>
      </div>

      {/* CLASSIC — read-only, just a way back */}
      {onBack && (
        <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
          <button className="button secondary" onClick={onBack}>← Back</button>
        </div>
      )}

      {/* GENERATED — favorite toggle, refine, start over */}
      {onRefine && (
        <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
          <button
            className={`button ${isFavorite ? '' : 'secondary'}`}
            onClick={onToggleFavorite}
            disabled={busy}
          >
            {isFavorite ? '★ Favorite' : '☆ Favorite'}
          </button>
          <button className="button" onClick={onRefine} disabled={busy}>
            Refine this drink
          </button>
          <button className="button secondary" onClick={onStartOver} disabled={busy}>
            Start over
          </button>
        </div>
      )}
    </article>
  );
}

function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}