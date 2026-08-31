import { useState } from 'react';
import VersionRow from './VersionRow.jsx';

// The full lineage of a drink, stacked oldest → newest. The favorite version
// (or, if none, the latest) starts expanded; the rest collapsed, so the
// convergence story reads top-to-bottom. Any row toggles independently.
//
// Each version shows ITS OWN origin: the root shows the brief that started it
// ("orange mojito"); each refinement shows the correction that produced it
// ("make it more rich"). So the story reads: asked for X → changed to Y → v2.
export default function LineageView({ versions, onBack }) {

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
      <button className="back-link" onClick={onBack}>← All drinks</button>

      <h2 className="recipe-name" style={{ margin: 'var(--sp-2) 0 var(--sp-4)' }}>{title}</h2>

      <div className="lineage">
        {versions.map((v, i) => (
          <VersionRow
            key={v.id}
            version={v}
            index={i}
            isFinal={!!v.is_final}
            expanded={open.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
    </div>
  );
}