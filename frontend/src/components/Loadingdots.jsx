import { useEffect, useState } from 'react';

// Animated "· ·· ···" cycling dots for long waits (generation takes 15–30s).
// Optional label shown before the dots, e.g. "Making".
export default function LoadingDots({ label = '' }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span>
      {label}
      <span className="loading-dots">{'.'.repeat(n)}</span>
    </span>
  );
}