import { contrastingTextColor } from "@/lib/driving-group-colors";

const PIN_WIDTH = 44;
const PIN_HEIGHT = 56;

/** Slightly adjust fills that disappear on typical map tiles (parks, water, roads). */
export function mapPinFillColor(fillColor: string): string {
  const mapTweaks: Record<string, string> = {
    "#16a34a": "#047857", // emerald — less park-green
    "#84cc16": "#65a30d",
    "#eab308": "#ca8a04",
    "#f8fafc": "#cbd5e1",
    "#0891b2": "#0e7490",
  };
  return mapTweaks[fillColor] ?? fillColor;
}

function pinSvg(fillColor: string, letter: string, isDriver = false): string {
  const fill = mapPinFillColor(fillColor);
  const labelColor = contrastingTextColor(fill);
  // Lucide Car icon (lucide@0.511.0) — https://lucide.dev/icons/car
  const driverBadge = isDriver
    ? `
  <circle cx="33" cy="8" r="8.5" fill="#ffffff" stroke="#0f172a" stroke-width="0.7" stroke-opacity="0.28"/>
  <g transform="translate(33 8) scale(0.58) translate(-12 -12)">
    <g fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/>
      <path d="M9 17h6"/>
      <circle cx="17" cy="17" r="2"/>
    </g>
  </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 44 56">
  <defs>
    <filter id="shadow" x="-40%" y="-20%" width="180%" height="160%">
      <feOffset dx="0" dy="4" in="SourceAlpha" result="off"/>
      <feGaussianBlur in="off" stdDeviation="4" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" result="shadow"/>
      <feMerge>
        <feMergeNode in="shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <ellipse cx="22" cy="53" rx="9" ry="2.5" fill="#0f172a" opacity="0.16"/>
  <g filter="url(#shadow)">
    <path d="M22 3.5c-8.01 0-14.5 6.49-14.5 14.5 0 10.2 14.5 29.5 14.5 29.5S36.5 28.2 36.5 18c0-8.01-6.49-14.5-14.5-14.5z"
      fill="${fill}" stroke="rgba(255,255,255,0.12)" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M22 3.5c-8.01 0-14.5 6.49-14.5 14.5 0 10.2 14.5 29.5 14.5 29.5S36.5 28.2 36.5 18c0-8.01-6.49-14.5-14.5-14.5z"
      fill="none" stroke="#0f172a" stroke-width="0.9" stroke-opacity="0.32" stroke-linejoin="round"/>
  </g>${driverBadge}
  <text x="22" y="22" text-anchor="middle" dominant-baseline="middle"
    font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="14" font-weight="700"
    fill="${labelColor}">${letter}</text>
</svg>`;
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** High-contrast teardrop pin for Google Maps markers. */
export function createMapPinIcon(
  fillColor: string,
  letter: string,
): google.maps.Icon {
  return {
    url: toDataUrl(pinSvg(fillColor, letter)),
    scaledSize: new google.maps.Size(PIN_WIDTH, PIN_HEIGHT),
    anchor: new google.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT),
    labelOrigin: new google.maps.Point(PIN_WIDTH / 2, 17),
  };
}

/** Same teardrop pin with a car badge — same fill colour. */
export function createDriverMapPinIcon(
  fillColor: string,
  letter: string,
): google.maps.Icon {
  return {
    url: toDataUrl(pinSvg(fillColor, letter, true)),
    scaledSize: new google.maps.Size(PIN_WIDTH, PIN_HEIGHT),
    anchor: new google.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT),
    labelOrigin: new google.maps.Point(PIN_WIDTH / 2, 17),
  };
}

const DEST_WIDTH = 48;
const DEST_HEIGHT = 60;
const DESTINATION_GOLD = "#d97706";

function destinationPinSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DEST_WIDTH}" height="${DEST_HEIGHT}" viewBox="0 0 48 60">
  <defs>
    <filter id="shadow" x="-40%" y="-20%" width="180%" height="160%">
      <feOffset dx="0" dy="4" in="SourceAlpha" result="off"/>
      <feGaussianBlur in="off" stdDeviation="4" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.28 0" result="shadow"/>
      <feMerge>
        <feMergeNode in="shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- plain gold fill (no gloss) -->
  </defs>
  <ellipse cx="24" cy="57" rx="10" ry="2.5" fill="#0f172a" opacity="0.16"/>
  <g filter="url(#shadow)">
    <path d="M24 4c-8.84 0-16 7.16-16 16 0 11.2 16 32 16 32s16-20.8 16-32c0-8.84-7.16-16-16-16z"
      fill="${DESTINATION_GOLD}" stroke="rgba(255,255,255,0.12)" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M24 4c-8.84 0-16 7.16-16 16 0 11.2 16 32 16 32s16-20.8 16-32c0-8.84-7.16-16-16-16z"
      fill="none" stroke="#0f172a" stroke-width="0.9" stroke-opacity="0.32" stroke-linejoin="round"/>
  </g>
  <polygon points="24,11 26.6,17.8 33.8,18.2 28.2,22.6 30,29.4 24,25.6 18,29.4 19.8,22.6 14.2,18.2 21.4,17.8"
    fill="#ffffff" stroke="none" stroke-linejoin="round"/>
</svg>`;
}

/** Gold teardrop with a star — trip destination. */
export function createDestinationPinIcon(): google.maps.Icon {
  return {
    url: toDataUrl(destinationPinSvg()),
    scaledSize: new google.maps.Size(DEST_WIDTH, DEST_HEIGHT),
    anchor: new google.maps.Point(DEST_WIDTH / 2, DEST_HEIGHT),
  };
}

export const DESTINATION_PIN_COLOR = DESTINATION_GOLD;
