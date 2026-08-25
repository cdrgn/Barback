import { useEffect, useState } from 'react';
import TemplatePicker from './components/TemplatePicker.jsx';
import BriefInput from './components/BriefInput.jsx';
import CorrectionInput from './components/CorrectionInput.jsx';
import RecipeView from './components/RecipeView.jsx';
import { fetchTemplates, generate, saveDrink, refine, markFinal } from './api/client.js';

// The app moves through a few phases:
//   'home'    — pick a classic or describe a custom drink
//   'draft'   — a recipe is composed but NOT poured; [Pour] / [Discard]
//   'poured'  — the drink is saved; [Refine] / [Mark final] / [New drink]
//   'refining'— entering a correction note to produce the next version
//
// The refine loop: poured → refining → draft(child) → poured(child) → … until
// the host marks a version final or starts a new drink. Each poured version is a
// child of the previous one (parentId), forming the lineage.
export default function App() {
  const [templates, setTemplates] = useState([]);
  const [phase, setPhase] = useState('home');

  const [brief, setBrief] = useState('');

  // the working recipe (draft or poured) + how it was made
  //   draft:  { recipe, source, template?, pickedTemplate?, attempts, parentId?, parent?, correction? }
  //   poured: adds { id, is_final }
  const [current, setCurrent] = useState(null);

  const [correction, setCorrection] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch((e) => setError(e.message));
  }, []);

  // ---- home → draft ----
  function chooseClassic(t) {
    setError('');
    setCurrent({ recipe: t.classic, source: 'classic', template: t });
    setPhase('draft');
  }

  async function handleGenerate() {
    setError('');
    setBusy(true);
    try {
      const result = await generate(null, brief);
      setCurrent({
        recipe: result.recipe,
        source: 'generated',
        pickedTemplate: result.pickedTemplate,
        attempts: result.attempts,
      });
      setPhase('draft');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- draft → poured ----
  async function handlePour() {
    setError('');
    setBusy(true);
    try {
      const templateName = current.source === 'classic'
        ? current.template.name
        : current.pickedTemplate.name;
      const saved = await saveDrink({
        recipe: current.recipe,
        template: templateName,
        source: current.source,
        brief: current.source === 'generated' ? brief : null,
        parentId: current.parentId ?? null,
        correction: current.correction ?? null,
      });
      setCurrent({
        ...current,
        recipe: saved,
        id: saved.id,
        is_final: !!saved.is_final,
      });
      setPhase('poured');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function discardDraft() {
    if (current?.parent) {
      setCurrent(current.parent);
      setPhase('poured');
    } else {
      resetToHome();
    }
  }

  // ---- poured → refining ----
  function startRefine() {
    setError('');
    setCorrection('');
    setPhase('refining');
  }

  async function handleRefine() {
    setError('');
    setBusy(true);
    try {
      const result = await refine(current.id, correction);
      setCurrent({
        recipe: result.recipe,
        source: 'generated',
        attempts: result.attempts,
        pickedTemplate: current.pickedTemplate
          ?? { name: current.recipe.template, display_name: current.template?.display_name },
        parentId: current.id,
        parent: current,
        correction,
      });
      setPhase('draft');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- poured → final ----
  async function handleMarkFinal() {
    setError('');
    setBusy(true);
    try {
      const updated = await markFinal(current.id, true);
      setCurrent({ ...current, is_final: !!updated.is_final });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function resetToHome() {
    setCurrent(null);
    setBrief('');
    setCorrection('');
    setPhase('home');
  }

  const header = (
    <header className="app-header">
      <h1 className="app-title">Barback</h1>
      <p className="app-subtitle">A hand at the bar.</p>
    </header>
  );

  if (phase === 'draft' || phase === 'poured' || phase === 'refining') {
    const poured = phase === 'poured';
    return (
      <div className="app">
        {header}
        {error && <div className="error">{error}</div>}

        <RecipeView
          recipe={current.recipe}
          attempts={current.attempts}
          pickedTemplate={current.pickedTemplate}
          onPour={phase === 'draft' ? handlePour : undefined}
          onDiscard={phase === 'draft' ? discardDraft : undefined}
          pouring={busy}
          onRefine={poured ? startRefine : undefined}
          onMarkFinal={poured ? handleMarkFinal : undefined}
          onNew={poured ? resetToHome : undefined}
          isFinal={current.is_final}
        />

        {phase === 'refining' && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <CorrectionInput
              correction={correction}
              onChange={setCorrection}
              onSubmit={handleRefine}
              onCancel={() => setPhase('poured')}
              refining={busy}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {header}
      <div className="stack">
        {error && <div className="error">{error}</div>}

        <TemplatePicker templates={templates} selectedName={null} onSelect={chooseClassic} />

        <div>
          <p className="section-label">Or describe what you want</p>
          <BriefInput
            brief={brief}
            onChange={setBrief}
            onSubmit={handleGenerate}
            disabled={!brief.trim()}
            generating={busy}
          />
        </div>
      </div>
    </div>
  );
}