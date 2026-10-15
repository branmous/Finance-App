// The app's mark: a simplified guilloché rosette (see guilloche.tsx) with a saffron peso at its center.
// Rings take the current text color, so the same mark works on ink and on paper.
const RING_ANGLES = Array.from({ length: 8 }, (_, index) => index * 22.5);

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        {RING_ANGLES.map((angle) => (
          <ellipse key={angle} cx="32" cy="32" rx="27" ry="10.5" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="8.5" fill="currentColor" />
      <circle cx="32" cy="32" r="5" className="fill-saffron" />
    </svg>
  );
}
