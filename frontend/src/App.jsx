import { useEffect, useState } from 'react';
import TemplatePicker from './components/TemplatePicker.jsx';
import BriefInput from './components/BriefInput.jsx';
import RecipeView from './components/RecipeView.jsx';
import { fetchTemplates, generate, saveDrink } from './api/client.js';

// State machine for the first-screen flow. Two ways to arrive at a recipe:
//   1. tap "Pour the classic" — uses the template's canonical recipe (no LLM).
//   2. type a brief + generate — LLM composes within the template (with retries).
// Either way, the recipe lives in state as a DRAFT until the host taps Pour,
// mirroring the pour-as-commit design (nothing hits the DB until then).
export default function App() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [brief, setBrief] = useState('');
  // draft = { recipe, source, attempts? }.  source is 'classic' or 'generated'.
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pouring, setPouring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch((e) => setError(e.message));
  }, []);

  function showClassic() {
    // The classic recipe is already on the template (server derived it).
    setError('');
    setDraft({ recipe: selectedTemplate.classic, source: 'classic' });
  }

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { recipe, attempts } = await generate(selectedTemplate.name, brief);
      setDraft({ recipe, source: 'generated', attempts });
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
      await saveDrink({
        recipe: draft.recipe,
        template: selectedTemplate.name,
        source: draft.source,
        // brief only makes sense for a generated drink
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

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Barback</h1>
        <p className="app-subtitle">A hand at the bar.</p>
      </header>

      <div className="stack">
        {error && <div className="error">{error}</div>}

        <TemplatePicker
          templates={templates}
          selectedName={selectedTemplate?.name}
          onSelect={(t) => {
            setSelectedTemplate(t);
            setDraft(null); // switching template resets any draft
          }}
        />

        {selectedTemplate && !draft && (
          <div className="stack">
            {/* Path 1: pour the classic as-is */}
            <button className="button" onClick={showClassic}>
              Pour a classic {selectedTemplate.display_name}
            </button>

            {/* Path 2: brief + generate a variation */}
            <div>
              <p className="section-label">Or invent one</p>
              <BriefInput
                brief={brief}
                onChange={setBrief}
                onSubmit={handleGenerate}
                disabled={!brief.trim()}
                generating={generating}
              />
            </div>
          </div>
        )}

        {draft && (
          <RecipeView
            recipe={draft.recipe}
            attempts={draft.attempts}
            onPour={handlePour}
            onDiscard={() => setDraft(null)}
            pouring={pouring}
          />
        )}
      </div>
    </div>
  );
}