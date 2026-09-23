import { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen.jsx';
import TemplatePicker from './components/TemplatePicker.jsx';
import BriefInput from './components/BriefInput.jsx';
import RecipeView from './components/RecipeView.jsx';
import RecipeHeader from './components/RecipeHeader.jsx';
import HistoryList from './components/HistoryList.jsx';
import LineageView from './components/LineageView.jsx';
import {
  fetchTemplates, generate, saveDrink, refine, markFavorite,
  fetchHistory, fetchLineage, setUnauthorizedHandler,
} from './api/client.js';
import { getToken, clearToken } from './api/token.js';

// Two tabs: MAKE and HISTORY.
//
// MAKE has three views:
//   'home'      — pick a classic (read-only) or describe a custom drink
//   'classic'   — a classic's canonical recipe; read-only, just [Back]
//   'generated' — a generated/refined drink; AUTO-SAVED to history on creation,
//                 so there's no pour gate. Actions: [★ Favorite] [Refine] [Start over]
//
// The refine loop stays in 'generated': each refinement is a child version,
// auto-saved, and becomes the current drink. Favorite (the is_favorite flag) is
// a toggle available any time; multiple versions can be favorited.
//
// Classics are never written to the DB — they already exist as templates.
export default function App() {
  // auth: is there a token? (null = logged out → show AuthScreen)
  const [authed, setAuthed] = useState(() => !!getToken()); // converts to bool, true | false

  const [tab, setTab] = useState('make'); // make | history
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState(''); 
  const [busy, setBusy] = useState(false);

  // MAKE state
  const [view, setView] = useState('home');     // home | classic | generated
  const [brief, setBrief] = useState('');
  const [current, setCurrent] = useState(null);  // the drink on screen, null | object
  const [correction, setCorrection] = useState('');

  // HISTORY state
  const [historyPhase, setHistoryPhase] = useState('list'); // list | lineage
  const [history, setHistory] = useState([]);
  const [lineage, setLineage] = useState(null); // null | array

  // When any request 401s, client.js clears the token and calls this — drop back
  // to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setAuthed(false));
  }, []);

  // Load templates once we're logged in (not before — the route requires a token).
  useEffect(() => {
    if (!authed) return;
    fetchTemplates().then(setTemplates).catch((e) => setError(e.message));
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'history' && historyPhase === 'list') {
      fetchHistory().then(setHistory).catch((e) => setError(e.message));
    }
  }, [authed, tab, historyPhase]);

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
        is_favorite: !!saved.is_favorite,
      });
      setView('generated');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // Refine the current drink → save child → land on it.

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
        is_favorite: !!saved.is_favorite,
      });
      setCorrection('');
      setView('generated');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function toggleFavorite() {
    setError(''); setBusy(true);
    try {
      const updated = await markFavorite(current.id, !current.is_favorite);
      setCurrent({ ...current, is_favorite: !!updated.is_favorite });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function goBack() {
    setCurrent(null); setBrief(''); setCorrection(''); setView('home');
  }

  function logout() {
    clearToken();
    setAuthed(false);
    // reset app state so the next user starts clean
    setCurrent(null); setBrief(''); setCorrection(''); setView('home');
    setTab('make'); setHistory([]); setLineage(null); setHistoryPhase('list');
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

  // The gate: no token → show login/signup, nothing else.
  if (!authed) {
    return <AuthScreen onAuthed={() => setAuthed(true)} />;
  }
  const header = (
    <header className="app-header">
      <h1 className="app-title">Barback</h1>
      <p className="app-subtitle">A hand at the bar.</p>
      <button className="logout-link" onClick={logout}>Log out</button>
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
        <RecipeHeader name={current.recipe.name} onBack={goBack} />
        <RecipeView recipe={current.recipe} />
      </div>
    );
  }

  // ---- MAKE tab: generated (auto-saved) ----
  if (view === 'generated') {
    return (
      <div className="app">
        {header}{tabs}
        {error && <div className="error">{error}</div>}
        <RecipeHeader name={current.recipe.name} onBack={goBack} />
        <RecipeView
          recipe={current.recipe}
          attempts={current.attempts}
          pickedTemplate={current.pickedTemplate}
          onToggleFavorite={toggleFavorite}
          isFavorite={current.is_favorite}
          correction={correction}
          onCorrectionChange={setCorrection}
          onRefine={handleRefine}
          refining={busy}
          busy={busy}
        />
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