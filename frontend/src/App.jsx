import { useEffect, useState } from 'react';
import TemplatePicker from './components/TemplatePicker.jsx';
import BriefInput from './components/BriefInput.jsx';
import RecipeView from './components/RecipeView.jsx';
import { fetchTemplates, generate, saveDrink } from './api/client.js';

// Parallel-paths layout — both options visible from the start:
//   1. Pick a classic template card (top section) → shows the canonical recipe.
//   2. Describe what you want (bottom section) → LLM picks the family AND
//      composes the drink in one open-mode call.
// Either way, the recipe lives in state as a DRAFT until Pour is tapped
// (pour-as-commit: nothing hits the DB until then).
export default function App() {
  const [templates, setTemplates] = useState([]);
  const [brief, setBrief] = useState('');
  // draft = { recipe, source, template, pickedTemplate?, attempts? }
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pouring, setPouring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch((e) => setError(e.message));
  }, []);

  function chooseClassic(t) {
    // The classic recipe is already on the template (server-derived).
    setError('');
    setDraft({ recipe: t.classic, source: 'classic', template: t });
  }

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      // OPEN mode: no template — the LLM picks one from the brief.
      const result = await generate(null, brief);
      setDraft({
        recipe: result.recipe,
        source: 'generated',
        pickedTemplate: result.pickedTemplate,   // { name, display_name, reasoning }
        attempts: result.attempts,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePour() {
    setError('');
    setPouring(true);
    try {
      // For classics, the template comes from what the host picked; for open
      // generation, from what the LLM picked (already on the recipe).
      const templateName = draft.source === 'classic'
        ? draft.template.name
        : draft.pickedTemplate.name;
      await saveDrink({
        recipe: draft.recipe,
        template: templateName,
        source: draft.source,
        brief: draft.source === 'generated' ? brief : null,
      });
      setDraft(null);
      setBrief('');
    } catch (e) {
      setError(e.message);
    } finally {
      setPouring(false);
    }
  }

  // While a draft is showing, only the recipe view is on screen — cleaner.
  if (draft) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">Barback</h1>
          <p className="app-subtitle">A hand at the bar.</p>
        </header>
        {error && <div className="error">{error}</div>}
        <RecipeView
          recipe={draft.recipe}
          attempts={draft.attempts}
          pickedTemplate={draft.pickedTemplate}
          onPour={handlePour}
          onDiscard={() => setDraft(null)}
          pouring={pouring}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Barback</h1>
        <p className="app-subtitle">A hand at the bar.</p>
      </header>

      <div className="stack">
        {error && <div className="error">{error}</div>}

        {/* Section 1 — pick a classic */}
        <TemplatePicker
          templates={templates}
          selectedName={null}
          onSelect={chooseClassic}
        />

        {/* Section 2 — describe a custom cocktail; LLM picks the family */}
        <div>
          <p className="section-label">Or describe what you want</p>
          <BriefInput
            brief={brief}
            onChange={setBrief}
            onSubmit={handleGenerate}
            disabled={!brief.trim()}
            generating={generating}
          />
        </div>
      </div>
    </div>
  );
}