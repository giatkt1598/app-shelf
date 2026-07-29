import { beforeEach, describe, expect, it } from 'vitest';
import { readBookmarks, saveBookmarks } from './storage';

describe('bookmark storage', () => {
  beforeEach(() => localStorage.clear());
  it('returns an empty list for absent data', () => expect(readBookmarks()).toEqual([]));
  it('persists bookmarks', () => { const bookmarks = [{ id: '1', name: 'Test', url: 'https://example.com', iconUrl: null, createdAt: '2026-01-01' }]; saveBookmarks(bookmarks); expect(readBookmarks()).toEqual(bookmarks); });
});
