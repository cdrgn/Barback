// Renders a recipe (draft or poured). Layout, top to bottom:
//   title
//   description (italic prose — always shown if present)
//   attribution box ("A custom [Family] — because..." — generated drinks only)
//   INGREDIENTS section
//   GARNISH section
//   INSTRUCTIONS section
//   footer: ABV · method · attempts
//
// Two action modes at the bottom, driven by which callbacks are passed:
//   DRAFT  (onPour):    [Pour it] [Discard, try again]
//   POURED (onRefine):  [Refine this drink] [Mark as final] [New drink]
// A recipe with neither is display-only (no buttons).
export default function RecipeView({
  recipe, attempts, pickedTemplate,
  onPour, onDiscard, pouring,
  onRefine, onMarkFinal, onNew, isFinal,
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

      {/* DRAFT actions */}
      {onPour && (
        <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
          <button className="button" onClick={onPour} disabled={pouring}>
            {pouring ? 'Pouring…' : 'Pour it'}
          </button>
          {onDiscard && (
            <button className="button secondary" onClick={onDiscard} disabled={pouring}>
              Discard, try again
            </button>
          )}
        </div>
      )}

      {/* POURED actions */}
      {onRefine && (
        <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
          {isFinal ? (
            <p className="recipe-final-badge">★ Marked as final</p>
          ) : (
            <>
              <button className="button" onClick={onRefine}>Refine this drink</button>
              <button className="button secondary" onClick={onMarkFinal}>Mark as final</button>
            </>
          )}
          {onNew && (
            <button className="button secondary" onClick={onNew}>New drink</button>
          )}
        </div>
      )}
    </article>
  );
}

function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}