/**
 * Decorative banknote-style rosette: a family of phase-shifted ellipses.
 * It is the one signature graphic of the app, used on the login panel.
 */
export function Guilloche({ className = "" }: { className?: string }) {
  const rings = Array.from({ length: 36 }, (_, index) => index * 5);
  return (
    <svg viewBox="-200 -200 400 400" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="0.6">
        {rings.map((angle) => (
          <ellipse key={angle} rx="190" ry="62" transform={`rotate(${angle})`} />
        ))}
      </g>
      <circle r="30" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}
