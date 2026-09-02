// The header shown above any drink card: a back arrow and the drink's name on
// one row (mobile-first — saves a vertical row vs stacking them). Used on every
// screen that shows a recipe (classic, generated, lineage), so the "return + title"
// treatment is defined once and stays consistent everywhere.
export default function RecipeHeader({ name, onBack }) {
  return (
    <div className="recipe-header-row">
      <button className="back-link" onClick={onBack} aria-label="Go back">←</button>
      <h2 className="recipe-name">{name}</h2>
    </div>
  );
}
