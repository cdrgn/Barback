import { useState } from 'react';
import VersionRow from './VersionRow.jsx';

// The full lineage of a drink, stacked oldest → newest. The favorite version
// (or, if none, the latest) starts expanded; the rest collapsed, so the
// convergence story reads top-to-bottom. Any row toggles independently.
//
// Correction placement: each version stores the correction that PRODUCED it
// (so it lives on the child). But it reads better as "what the host said about
// THIS version" — so we shift each version's correction onto its PARENT. The
// last version has no note (it's the keeper, nothing was wrong with it yet).
export default function LineageView({ versions, onBack }) {
  // note about version i = correction stored on version i+1 (its child)
  const noteFor = (i) => versions[i + 1]?.correction ?? null;

  const defaultOpen = (() => {
    const finalIdx = versions.findIndex((v) => v.is_final);
    return finalIdx !== -1 ? finalIdx : versions.length - 1;
  })();

  const [open, setOpen] = useState(() => new Set([defaultOpen]));

  function toggle(i) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const title = versions[0]?.name ?? 'Lineage';

  return (
    <div>
      <button className="button secondary" onClick={onBack} style={{ marginBottom: 'var(--sp-4)' }}>
        ← Back to history
      </button>

      <h2 className="recipe-name" style={{ marginBottom: 'var(--sp-4)' }}>{title}</h2>

      <div className="lineage">
        {versions.map((v, i) => (
          <VersionRow
            key={v.id}
            version={v}
            index={i}
            isFinal={!!v.is_final}
            noteAboutThis={noteFor(i)}
            expanded={open.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
    </div>
  );
}