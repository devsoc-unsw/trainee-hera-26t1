/**
 * Full-bleed Sydney map (static asset) with a light blur so the UI stays readable.
 */
export function LandingMapBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#dde3e8]"
      aria-hidden
    >
      <div
        className="absolute inset-0 scale-[1.06] bg-cover bg-center blur-[4px]"
        style={{ backgroundImage: "url('/landing-map-sydney.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/12 to-white/22" />
    </div>
  );
}
