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

// Two top-level tabs: MAKE and HISTORY.
//
// MAKE moves through phases:
//   'home' -> 'draft' -> 'poured' -> 'refining' -> 'draft'(child) -> ...
//   The refine loop links each poured version to its parent (lineage).
//
// HISTORY moves through:
//   'list' (past drinks) -> 'lineage' (one drink's stacked versions).
export default function App() {
  const [tab, setTab] = useState('make');
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // MAKE state
  const [phase, setPhase] = useState('home');
  const [brief, setBrief] = useState('');
  const [current, setCurrent] = useState(null);
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

  // ===== MAKE handlers =====
  function chooseClassic(t) {
    setError('');
    setCurrent({ recipe: t.classic, source: 'classic', template: t });
    setPhase('draft');
  }

  async function handleGenerate() {
    setError(''); setBusy(true);
    try {
      const result = await generate(null, brief);
      setCurrent({
        recipe: result.recipe, source: 'generated',
        pickedTemplate: result.pickedTemplate, attempts: result.attempts,
      });
      setPhase('draft');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handlePour() {
    setError(''); setBusy(true);
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
      setCurrent({ ...current, recipe: saved, id: saved.id, is_final: !!saved.is_final });
      setPhase('poured');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function discardDraft() {
    if (current?.parent) { setCurrent(current.parent); setPhase('poured'); }
    else { resetToHome(); }
  }

  function startRefine() { setError(''); setCorrection(''); setPhase('refining'); }

  async function handleRefine() {
    setError(''); setBusy(true);
    try {
      const result = await refine(current.id, correction);
      setCurrent({
        recipe: result.recipe, source: 'generated', attempts: result.attempts,
        pickedTemplate: current.pickedTemplate
          ?? { name: current.recipe.template, display_name: current.template?.display_name },
        parentId: current.id, parent: current, correction,
      });
      setPhase('draft');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handleMarkFinal() {
    setError(''); setBusy(true);
    try {
      const updated = await markFinal(current.id, true);
      setCurrent({ ...current, is_final: !!updated.is_final });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function resetToHome() {
    setCurrent(null); setBrief(''); setCorrection(''); setPhase('home');
  }

  // ===== HISTORY handlers =====
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
      <button
        className={`tab ${tab === 'make' ? 'active' : ''}`}
        onClick={() => setTab('make')}
      >Make</button>
      <button
        className={`tab ${tab === 'history' ? 'active' : ''}`}
        onClick={() => { setTab('history'); setHistoryPhase('list'); }}
      >History</button>
    </div>
  );

  // ---- HISTORY tab ----
  if (tab === 'history') {
    return (
      <div className="app">
        {header}
        {tabs}
        {error && <div className="error">{error}</div>}
        {historyPhase === 'lineage' && lineage
          ? <LineageView versions={lineage} onBack={backToHistory} />
          : <HistoryList drinks={history} onOpen={openLineage} />}
      </div>
    );
  }

  // ---- MAKE tab: draft / poured / refining ----
  if (phase === 'draft' || phase === 'poured' || phase === 'refining') {
    const poured = phase === 'poured';
    return (
      <div className="app">
        {header}
        {tabs}
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

  // ---- MAKE tab: home ----
  return (
    <div className="app">
      {header}
      {tabs}
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