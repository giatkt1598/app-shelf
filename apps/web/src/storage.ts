import type { Bookmark } from './types';
const KEY = 'app-shelf.bookmarks.v1';
const BACKGROUND_KEY = 'app-shelf.background.v1';
const BACKGROUND_APPEARANCE_KEY = 'app-shelf.background-appearance.v1';
export type BackgroundAppearance = { background: string | null; brightness: number; blur: number; textColor: string };
export function readBookmarks(): Bookmark[] { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
export function saveBookmarks(bookmarks: Bookmark[]) { localStorage.setItem(KEY, JSON.stringify(bookmarks)); }
export function readBackground(): string | null { return localStorage.getItem(BACKGROUND_KEY); }
export function saveBackground(background: string | null) { if (background) localStorage.setItem(BACKGROUND_KEY, background); else localStorage.removeItem(BACKGROUND_KEY); }
export function readBackgroundAppearance(): BackgroundAppearance {
  try {
    const saved = localStorage.getItem(BACKGROUND_APPEARANCE_KEY);
    if (saved) { const value = JSON.parse(saved); if (typeof value?.brightness === 'number') return { background: value.background ?? null, brightness: value.brightness, blur: typeof value.blur === 'number' ? value.blur : 0, textColor: typeof value.textColor === 'string' ? value.textColor : '#f8fafc' }; }
  } catch { /* Use defaults below. */ }
  return { background: readBackground(), brightness: 1, blur: 0, textColor: '#f8fafc' };
}
export function saveBackgroundAppearance(appearance: BackgroundAppearance) { localStorage.setItem(BACKGROUND_APPEARANCE_KEY, JSON.stringify(appearance)); }
