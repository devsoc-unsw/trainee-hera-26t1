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
  const driverBadge = isDriver
    ? `
  <circle cx="22" cy="18" r="14.5" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.5"/>
  <circle cx="34" cy="9" r="6.5" fill="#ffffff" stroke="#0f172a" stroke-width="0.7" stroke-opacity="0.28"/>
  <g fill="${fill}" transform="translate(34 9) scale(0.38) translate(-12 -12)">
    <path d="M6 14h2l1.2-3.4a1 1 0 0 1 .95-.7h5.7a1 1 0 0 1 .95.7L18 14h2a1 1 0 0 1 1 1v2.2a1 1 0 0 1-1 1h-.9a2.2 2.2 0 0 1-4.2 0h-2.8a2.2 2.2 0 0 1-4.2 0H6a1 1 0 0 1-1-1V15a1 1 0 0 1 1-1zm1.8-3.5L8.8 12h6.4l1-1.5H7.8z"/>
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

/** Same teardrop pin with a white ring and car badge — same fill colour. */
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
