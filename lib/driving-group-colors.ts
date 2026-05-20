/** Named palette for driving groups (cycles, then golden-angle HSL for more). */
const PALETTE_HEX = [
  "#dc2626", // red
  "#16a34a", // green
  "#eab308", // yellow
  "#ea580c", // orange
  "#2563eb", // blue
  "#ec4899", // pink
  "#9333ea", // purple
  "#0f172a", // black (slate-900)
  "#f8fafc", // white
  "#92400e", // brown
  "#0891b2", // cyan
  "#4f46e5", // indigo
  "#84cc16", // lime
  "#f97316", // deep orange
] as const;

export function getDrivingGroupColor(groupIndex: number): string {
  if (groupIndex < PALETTE_HEX.length) {
    return PALETTE_HEX[groupIndex];
  }
  const hue = (groupIndex * 137.508) % 360;
  return `hsl(${hue}, 65%, 42%)`;
}

export function buildGroupColorById(
  groups: readonly { id: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  groups.forEach((g, i) => {
    map[g.id] = getDrivingGroupColor(i);
  });
  return map;
}

/** Text/label color that contrasts with a pin or avatar fill. */
export function contrastingTextColor(fillColor: string): "#ffffff" | "#1e293b" {
  const hex = fillColor.trim();
  if (hex.startsWith("hsl")) {
    const match = /hsl\(\s*[\d.]+\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/.exec(hex);
    const lightness = match ? Number(match[2]) : 50;
    return lightness > 62 ? "#1e293b" : "#ffffff";
  }
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#ffffff";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72 ? "#1e293b" : "#ffffff";
}
