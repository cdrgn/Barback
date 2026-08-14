// Renders a recipe (draft or saved). Layout, top to bottom:
//   title
//   description (italic prose — always shown if present)
//   attribution box ("A custom [Family] — because..." — generated drinks only)
//   INGREDIENTS section
//   GARNISH section
//   INSTRUCTIONS section
//   footer: ABV · method · attempts
//
// Section labels share the same greyed-uppercase style as the app's other
// labels ("Choose a classic to make"), keeping one design language across the app.
//
// `onPour` and `onDiscard` are only shown when the recipe is a DRAFT (not yet saved).
export default function RecipeView({ recipe, attempts, pickedTemplate, onPour, onDiscard, pouring }) {
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
    </article>
  );
}

function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}