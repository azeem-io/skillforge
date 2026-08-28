/**
 * A blank that has to be filled before these pages mean anything.
 *
 * Rendered loudly on purpose. A privacy policy naming no operator and no
 * contact address is not a privacy policy, and the failure mode to design
 * against is shipping one where the gap is quiet enough to miss.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-warning/25 text-foreground rounded px-1 font-mono text-[0.9em] font-medium">
      [{children}]
    </mark>
  );
}
