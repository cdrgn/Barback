// The history list — one row per lineage (root drink), newest first. Each row
// shows the drink name, when it was made, a version count, and a ★ if any
// version in the lineage was marked final. Tapping a row opens its lineage.
export default function HistoryList({ drinks, onOpen }) {
  if (!drinks.length) {
    return <p className="section-label">No drinks poured yet — make one first.</p>;
  }

  return (
    <div>
      <p className="section-label">Created drinks</p>
      <ul className="history-list">
        {drinks.map((d) => (
          <li key={d.id}>
            <button className="history-row" onClick={() => onOpen(d.id)}>
              <span className="history-row-main">
                <span className="history-row-name">{d.name}</span>
                {d.has_final && <span className="history-row-star">★</span>}
              </span>
              <span className="history-row-meta">
                {formatDate(d.created_at)}
                {d.version_count > 1 && ` · ${d.version_count} versions`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// SQLite stores created_at as a UTC string; show a short local date + time.
function formatDate(s) {
  const d = new Date(s.includes('Z') ? s : s.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}