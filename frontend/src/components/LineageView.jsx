import { useState } from 'react';
import VersionRow from './VersionRow.jsx';
import RecipeHeader from './RecipeHeader.jsx';

// The full lineage of a drink, stacked oldest → newest. The favorite version
// (or, if none, the latest) starts expanded; the rest collapsed, so the
// convergence story reads top-to-bottom. Any row toggles independently.
//
// Each version shows ITS OWN origin: the root shows the brief that started it
// ("orange mojito"); each refinement shows the correction that produced it
// ("make it more rich"). So the story reads: asked for X → changed to Y → v2.
export default function LineageView({ versions, onBack }) {

  const defaultOpen = (() => {
    const finalIdx = versions.findIndex((v) => v.is_favorite);
    // const finalIdx = versions.findIndex((v) => v.is_favorite).lastIndexOf(true); // newest favorited version open
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
      <RecipeHeader name={title} onBack={onBack} />

      <div className="lineage">
        {versions.map((v, i) => (
          <VersionRow
            key={v.id}
            version={v}
            index={i}
            isFavorite={!!v.is_favorite}
            expanded={open.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
    </div>
  );
}