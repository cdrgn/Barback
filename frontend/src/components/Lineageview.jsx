import { useState } from 'react';
import VersionRow from './VersionRow.jsx';

// The full lineage of a drink, stacked oldest → newest. The final version (or,
// if none is marked final, the latest) starts expanded; the rest are collapsed
// so the convergence story reads top-to-bottom without three full recipes at once.
// Any row can be toggled independently.
export default function LineageView({ versions, onBack }) {
  // index of the version that should be open by default
  const defaultOpen = (() => {
    const finalIdx = versions.findIndex((v) => v.is_final);
    return finalIdx !== -1 ? finalIdx : versions.length - 1;
  })();

  // a Set of open indices (multiple can be open)
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
            expanded={open.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
    </div>
  );
}