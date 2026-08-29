import { useEffect, useState } from 'react';
import TemplatePicker from './components/TemplatePicker.jsx';
import BriefInput from './components/BriefInput.jsx';
import CorrectionInput from './components/CorrectionInput.jsx';
import RecipeView from './components/RecipeView.jsx';
import HistoryList from './components/HistoryList.jsx';
import LineageView from './components/LineageView.jsx';
import {
  fetchTemplates, generate, saveDrink, refine, markFinal,
  fetchHistory, fetchLineage,
} from './api/client.js';

// Two tabs: MAKE and HISTORY.
//
// MAKE has three views:
//   'home'      — pick a classic (read-only) or describe a custom drink
//   'classic'   — a classic's canonical recipe; read-only, just [Back]
//   'generated' — a generated/refined drink; AUTO-SAVED to history on creation,
//                 so there's no pour gate. Actions: [★ Favorite] [Refine] [Start over]
//
// The refine loop stays in 'generated': each refinement is a child version,
// auto-saved, and becomes the current drink. Favorite (the is_final flag,
// relabeled) is a toggle available any time — no "mark final in the moment" step.
//
// Classics are never written to the DB — they already exist as templates.
export default function App() {
  const [tab, setTab] = useState('make');
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // MAKE state
  const [view, setView] = useState('home');     // home | classic | generated
  const [brief, setBrief] = useState('');
  const [current, setCurrent] = useState(null);  // the drink on screen
  const [refining, setRefining] = useState(false);
  const [correction, setCorrection] = useState('');

  // HISTORY state
  const [historyPhase, setHistoryPhase] = useState('list');
  const [history, setHistory] = useState([]);
  const [lineage, setLineage] = useState(null);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (tab === 'history' && historyPhase === 'list') {
      fetchHistory().then(setHistory).catch((e) => setError(e.message));
    }
  }, [tab, historyPhase]);

  // ===== MAKE =====

  // Classic: read-only, nothing saved.
  function chooseClassic(t) {
    setError('');
    setCurrent({ recipe: t.classic });
    setView('classic');
  }

  // Generate → immediately save → land on the saved generated drink.
  async function handleGenerate() {
    setError(''); setBusy(true);
    try {
      const result = await generate(null, brief);
      const saved = await saveDrink({
        recipe: result.recipe,
        template: result.pickedTemplate.name,
        source: 'generated',
        brief,
      });
      setCurrent({
        recipe: saved,                       // saved: has id, abv, ingredients
        id: saved.id,
        pickedTemplate: result.pickedTemplate,
        attempts: result.attempts,
        is_final: !!saved.is_final,
      });
      setView('generated');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // Refine the current drink → save child → land on it.
  function startRefine() { setError(''); setCorrection(''); setRefining(true); }

  async function handleRefine() {
    setError(''); setBusy(true);
    try {
      const result = await refine(current.id, correction);
      const saved = await saveDrink({
        recipe: result.recipe,
        template: current.pickedTemplate.name,
        source: 'generated',
        parentId: current.id,
        correction,
      });
      setCurrent({
        recipe: saved,
        id: saved.id,
        pickedTemplate: current.pickedTemplate,
        attempts: result.attempts,
        is_final: !!saved.is_final,
      });
      setRefining(false);
      setView('generated');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function toggleFavorite() {
    setError(''); setBusy(true);
    try {
      const updated = await markFinal(current.id, !current.is_final);
      setCurrent({ ...current, is_final: !!updated.is_final });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function startOver() {
    setCurrent(null); setBrief(''); setCorrection(''); setRefining(false); setView('home');
  }

  // ===== HISTORY =====
  async function openLineage(id) {
    setError('');
    try {
      const versions = await fetchLineage(id);
      setLineage(versions);
      setHistoryPhase('lineage');
    } catch (e) { setError(e.message); }
  }
  function backToHistory() { setLineage(null); setHistoryPhase('list'); }

  // ===== render =====
  const header = (
    <header className="app-header">
      <h1 className="app-title">Barback</h1>
      <p className="app-subtitle">A hand at the bar.</p>
    </header>
  );

  const tabs = (
    <div className="tabs">
      <button className={`tab ${tab === 'make' ? 'active' : ''}`}
        onClick={() => setTab('make')}>Make</button>
      <button className={`tab ${tab === 'history' ? 'active' : ''}`}
        onClick={() => { setTab('history'); setHistoryPhase('list'); }}>History</button>
    </div>
  );

  // ---- HISTORY tab ----
  if (tab === 'history') {
    return (
      <div className="app">
        {header}{tabs}
        {error && <div className="error">{error}</div>}
        {historyPhase === 'lineage' && lineage
          ? <LineageView versions={lineage} onBack={backToHistory} />
          : <HistoryList drinks={history} onOpen={openLineage} />}
      </div>
    );
  }

  // ---- MAKE tab: classic (read-only) ----
  if (view === 'classic') {
    return (
      <div className="app">
        {header}{tabs}
        {error && <div className="error">{error}</div>}
        <RecipeView recipe={current.recipe} onBack={startOver} />
      </div>
    );
  }

  // ---- MAKE tab: generated (auto-saved) ----
  if (view === 'generated') {
    return (
      <div className="app">
        {header}{tabs}
        {error && <div className="error">{error}</div>}
        <RecipeView
          recipe={current.recipe}
          attempts={current.attempts}
          pickedTemplate={current.pickedTemplate}
          onRefine={startRefine}
          onStartOver={startOver}
          onToggleFavorite={toggleFavorite}
          isFavorite={current.is_final}
          busy={busy}
        />
        {refining && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <CorrectionInput
              correction={correction}
              onChange={setCorrection}
              onSubmit={handleRefine}
              onCancel={() => setRefining(false)}
              refining={busy}
            />
          </div>
        )}
      </div>
    );
  }

  // ---- MAKE tab: home ----
  return (
    <div className="app">
      {header}{tabs}
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