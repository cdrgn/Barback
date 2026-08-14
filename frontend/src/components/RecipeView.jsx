// Renders a recipe (draft or saved) — name, ingredients, garnish/notes/steps,
// footer with ABV and attempts. `onPour` and `onDiscard` are optional actions
// shown when the recipe is a DRAFT (not yet saved).
//
// When `pickedTemplate` is passed (open-mode generation), shows a short
// "A custom [Family]" attribution with the LLM's reasoning above the ingredients.
export default function RecipeView({ recipe, attempts, pickedTemplate, onPour, onDiscard, pouring }) {
  return (
    <article className="recipe">
      <h2 className="recipe-name">{recipe.name}</h2>
      <p className="recipe-meta">{recipe.method}</p>

      {pickedTemplate && (
        <p className="recipe-attribution">
          A custom <strong>{pickedTemplate.display_name}</strong>
          {pickedTemplate.reasoning && ` — ${pickedTemplate.reasoning}`}
        </p>
      )}

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

      {recipe.garnish && (
        <p className="recipe-steps">
          <strong>Garnish:</strong> {recipe.garnish}
        </p>
      )}
      {recipe.steps && <p className="recipe-steps">{recipe.steps}</p>}
      {recipe.notes && <p className="recipe-notes">{recipe.notes}</p>}

      <div className="recipe-footer">
        {recipe.abv != null && <span>ABV ~{recipe.abv}%</span>}
        {attempts != null && <span>{attempts} attempt{attempts === 1 ? '' : 's'}</span>}
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