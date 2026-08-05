import { useEffect, useState } from 'react';
import type { ThemeMode } from '../types';
import { buildAccentPalette, normalizeHex, type ResolvedTheme } from '../lib/color';

const THEME_KEY = 'certifolio-theme';
const ACCENT_KEY = 'certifolio-accent';

function applyAccentVariables(accent: string, resolved: ResolvedTheme) {
  const palette = buildAccentPalette(accent, resolved);
  const root = document.documentElement;
  root.style.setProperty('--accent-raw', palette.raw);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-rgb', palette.rgb);
  root.style.setProperty('--accent-contrast', palette.onAccent);
  root.style.setProperty('--accent-contrast-rgb', palette.contrastRgb);
  root.style.setProperty('--accent-strong', palette.strong);
  root.style.setProperty('--accent-overlay', palette.overlay);
  root.style.setProperty('--accent-overlay-strong', palette.overlayStrong);

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', palette.accent);
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  const [accent, setAccentState] = useState(() => normalizeHex(localStorage.getItem(ACCENT_KEY) || '#315c46'));

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved: ResolvedTheme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
      document.documentElement.dataset.theme = resolved;
      applyAccentVariables(accent, resolved);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode, accent]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(THEME_KEY, next);
  };
  const setAccent = (next: string) => {
    const normalized = normalizeHex(next);
    setAccentState(normalized);
    localStorage.setItem(ACCENT_KEY, normalized);
  };

  return { mode, accent, setMode, setAccent };
}
