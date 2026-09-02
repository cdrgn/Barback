import LoadingDots from './LoadingDots.jsx';

// Renders a recipe. Layout, top to bottom:
//   title / description / attribution / INGREDIENTS / GARNISH / INSTRUCTIONS / footer
//
// Actions depend on mode (driven by which callbacks are passed):
//   CLASSIC (read-only):  (no actions — navigation lives above the card)
//   GENERATED (saved):    [★ Favorite]
//                         [ what would you change? textarea ] [Refine it]
//                         [Return]
// The correction box is always inline — no toggle, no cancel. "Refine it" only
// enables once there's text, so an empty box is simply inert.
export default function RecipeView({
  recipe, attempts, pickedTemplate,
  onToggleFavorite, isFavorite,    // generated: the ★ toggle
  correction, onCorrectionChange, onRefine, refining,  // generated: inline refine
  busy,
}) {
  const generated = !!onRefine;

  return (
    <article className="recipe">
      {/* <h2 className="recipe-name">{recipe.name}</h2> */}

      {recipe.description && (
        <p className="recipe-description">{recipe.description}</p>
      )}

      {/* {pickedTemplate && (
        <p className="recipe-attribution">
          A custom <strong>{pickedTemplate.display_name}</strong>
          {pickedTemplate.reasoning && ` — ${pickedTemplate.reasoning}`}
        </p>
      )} */}

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
        </span>
      </div>

      {/* GENERATED — favorite, inline refine, return */}
      {generated && (
        <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
          <button
            className={`button ${isFavorite ? '' : 'secondary'}`}
            onClick={onToggleFavorite}
            disabled={busy}
          >
            {isFavorite ? '★ Favorite' : '☆ Favorite'}
          </button>

          <div>
            <p className="section-label">What would you change?</p>
            <textarea
              className="brief-input"
              placeholder="e.g. too sweet, a little more lime"
              value={correction}
              onChange={(e) => onCorrectionChange(e.target.value)}
              disabled={refining || busy}
            />
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <button
                className="button"
                onClick={onRefine}
                disabled={!correction.trim() || refining || busy}
              >
                {refining ? <LoadingDots label="Refining" /> : 'Refine it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}