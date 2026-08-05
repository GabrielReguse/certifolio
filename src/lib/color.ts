export type ResolvedTheme = 'light' | 'dark';

type RGB = { r: number; g: number; b: number };

const FALLBACK_ACCENT = '#315c46';

export function normalizeHex(value: string, fallback = FALLBACK_ACCENT): string {
  const input = String(value || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(input)) return input;
  if (/^#[0-9a-f]{3}$/.test(input)) {
    return `#${input[1]}${input[1]}${input[2]}${input[2]}${input[3]}${input[3]}`;
  }
  return fallback;
}

function hexToRgb(hex: string): RGB {
  const normalized = normalizeHex(hex);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function channelToHex(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

function rgbToHex({ r, g, b }: RGB) {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function linearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

export function contrastRatio(first: string, second: string) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mixHex(first: string, second: string, secondWeight: number) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const weight = Math.max(0, Math.min(1, secondWeight));
  return rgbToHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
}

function ensureContrast(foreground: string, background: string, minimum: number) {
  const color = normalizeHex(foreground);
  if (contrastRatio(color, background) >= minimum) return color;

  const targets = ['#ffffff', '#000000'] as const;
  let best = color;
  let bestDistance = 2;

  for (const target of targets) {
    let low = 0;
    let high = 1;
    let candidate: string = target;

    for (let index = 0; index < 22; index += 1) {
      const weight = (low + high) / 2;
      const mixed = mixHex(color, target, weight);
      if (contrastRatio(mixed, background) >= minimum) {
        candidate = mixed;
        high = weight;
      } else {
        low = weight;
      }
    }

    if (high < bestDistance) {
      bestDistance = high;
      best = candidate;
    }
  }

  return best;
}

export function bestTextColor(background: string) {
  const black = '#111114';
  const white = '#ffffff';
  return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

export function buildAccentPalette(input: string, theme: ResolvedTheme) {
  const raw = normalizeHex(input);
  const pageBackground = theme === 'dark' ? '#09090b' : '#f4f6f2';
  const surface = theme === 'dark' ? '#151519' : '#ffffff';
  let accent = ensureContrast(raw, pageBackground, 4.5);
  accent = ensureContrast(accent, surface, 4.5);
  const onAccent = bestTextColor(accent);
  const hoverTarget = onAccent === '#ffffff' ? '#ffffff' : '#000000';
  const strong = mixHex(accent, hoverTarget, 0.12);
  const rgb = hexToRgb(accent);
  const contrastRgb = hexToRgb(onAccent);
  const overlay = onAccent === '#ffffff' ? 'rgba(9,9,12,.72)' : 'rgba(255,255,255,.74)';
  const overlayStrong = onAccent === '#ffffff' ? 'rgba(9,9,12,.82)' : 'rgba(255,255,255,.86)';

  return {
    raw,
    accent,
    strong,
    onAccent,
    rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    contrastRgb: `${contrastRgb.r}, ${contrastRgb.g}, ${contrastRgb.b}`,
    pageBackground,
    surface,
    overlay,
    overlayStrong,
  };
}
