import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { readBackgroundAppearance, readBookmarks, readLanguage, readOpenInNewTab, saveBackgroundAppearance, saveBookmarks, saveLanguage, saveOpenInNewTab, type BackgroundAppearance } from './storage';
import type { Bookmark } from './types';

type Copy = {
  eyebrow: string; tagline: string; apps: (count: number) => string; settings: string; editList: string; changeTheme: string; openInNewTab: string; language: string; save: string; addApp: string; open: (name: string) => string; edit: (name: string) => string; delete: (name: string) => string; confirmDelete: (name: string) => string; editApp: string; addAppTitle: string; close: string; loadingMetadata: string; metadataHint: string; invalidUrl: string; httpOnly: string; appName: string; iconUrl: string; cancel: string; saveChanges: string; addToGrid: string; deleteApp: string; themeDescription: string; background: string; default: string; brightness: string; blur: string; uploadImage: string; textColor: string; custom: string;
};
const COPY: Record<'vi' | 'en', Copy> = {
  vi: { eyebrow: 'YOUR FAVORITE APPS', tagline: 'Một nơi gọn gàng cho mọi tool của bạn.', apps: count => `${count} app`, settings: 'Cài đặt', editList: 'Chỉnh sửa danh sách app', changeTheme: 'Đổi giao diện', openInNewTab: 'Mở trong tab mới', language: 'Ngôn ngữ', save: 'Lưu', addApp: 'Thêm mới', open: name => `Mở ${name}`, edit: name => `Chỉnh sửa ${name}`, delete: name => `Xóa ${name}`, confirmDelete: name => `Xóa ${name}?`, editApp: 'Chỉnh sửa', addAppTitle: 'Thêm mới', close: 'Đóng', loadingMetadata: 'Đang lấy title và favicon…', metadataHint: 'Rời khỏi ô URL để tự điền title và favicon.', invalidUrl: 'Nhập một URL HTTP hoặc HTTPS hợp lệ.', httpOnly: 'Chỉ hỗ trợ URL HTTP hoặc HTTPS.', appName: 'Tên app', iconUrl: 'Icon URL', cancel: 'Hủy', saveChanges: 'Lưu thay đổi', addToGrid: 'Thêm vào grid', deleteApp: 'Xóa app', themeDescription: 'Chọn background, độ hiển thị và màu chữ cho app.', background: 'Hình nền', default: 'Mặc định', brightness: 'Độ sáng', blur: 'Độ mờ', uploadImage: 'Tải ảnh từ máy', textColor: 'Màu chữ', custom: 'Tùy chỉnh' },
  en: { eyebrow: 'YOUR FAVORITE APPS', tagline: 'One tidy home for all your tools.', apps: count => `${count} app${count === 1 ? '' : 's'}`, settings: 'Settings', editList: 'Edit app list', changeTheme: 'Change appearance', openInNewTab: 'Open in new tab', language: 'Language', save: 'Save', addApp: 'Add new', open: name => `Open ${name}`, edit: name => `Edit ${name}`, delete: name => `Delete ${name}`, confirmDelete: name => `Delete ${name}?`, editApp: 'Edit', addAppTitle: 'Add new', close: 'Close', loadingMetadata: 'Fetching title and favicon…', metadataHint: 'Leave the URL field to fill in the title and favicon.', invalidUrl: 'Enter a valid HTTP or HTTPS URL.', httpOnly: 'Only HTTP and HTTPS URLs are supported.', appName: 'App name', iconUrl: 'Icon URL', cancel: 'Cancel', saveChanges: 'Save changes', addToGrid: 'Add to grid', deleteApp: 'Delete app', themeDescription: 'Choose a background, display controls, and text color.', background: 'Background', default: 'Default', brightness: 'Brightness', blur: 'Blur', uploadImage: 'Upload image', textColor: 'Text color', custom: 'Custom' }
};
const CopyContext = createContext<Copy>(COPY.vi);
const useCopy = () => useContext(CopyContext);
const SYNC_COPY = {
  vi: { sync: 'Đồng bộ', export: 'Export', import: 'Import', clearAll: 'Xóa tất cả', title: 'Xóa tất cả app?', description: 'Thao tác này sẽ xóa toàn bộ app trong bản nháp. Cậu vẫn cần bấm Lưu để xác nhận.', confirm: 'Xóa tất cả', invalid: 'File .app-shelf không hợp lệ.', success: (count: number) => `Đã import ${count} app.` },
  en: { sync: 'Sync', export: 'Export', import: 'Import', clearAll: 'Clear all', title: 'Clear all apps?', description: 'This removes every app from the draft. Press Save to commit the change.', confirm: 'Clear all', invalid: 'Invalid .app-shelf file.', success: (count: number) => `Imported ${count} apps.` }
};

type Form = { id?: string; url: string; name: string; iconUrl: string; nameTouched: boolean; iconTouched: boolean };
const blankForm = (): Form => ({ url: '', name: '', iconUrl: '', nameTouched: false, iconTouched: false });
const hostname = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'App'; } };
const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || 'A';
const BACKGROUNDS = [
  { name: 'Midnight', value: 'radial-gradient(circle at 18% 12%, #4338ca88, transparent 32rem), radial-gradient(circle at 85% 85%, #164e63aa, transparent 30rem), linear-gradient(145deg, #090b1f, #14102a)' },
  { name: 'Aurora', value: 'radial-gradient(circle at 15% 10%, #0f766e, transparent 34rem), radial-gradient(circle at 85% 5%, #4c1d95, transparent 32rem), linear-gradient(135deg, #071a2a, #111827)' },
  { name: 'Sunset', value: 'radial-gradient(circle at 10% 0%, #be123c88, transparent 32rem), radial-gradient(circle at 90% 10%, #c2410c77, transparent 30rem), linear-gradient(135deg, #1e1022, #17121a)' },
  { name: 'Ocean', value: 'radial-gradient(circle at 20% 15%, #0369a1aa, transparent 30rem), radial-gradient(circle at 80% 80%, #155e75aa, transparent 28rem), linear-gradient(145deg, #06141f, #0b1d29)' },
  { name: 'Forest', value: 'radial-gradient(circle at 20% 0%, #16653488, transparent 30rem), radial-gradient(circle at 90% 20%, #36531499, transparent 25rem), linear-gradient(135deg, #0d1a12, #101713)' }
];
const TEXT_COLORS = [
  { name: 'Moon', value: '#f8fafc', preview: 'linear-gradient(135deg, #ffffff, #cbd5e1)' },
  { name: 'Lavender', value: '#ddd6fe', preview: 'linear-gradient(135deg, #f5f3ff, #a78bfa)' },
  { name: 'Sky', value: '#bae6fd', preview: 'linear-gradient(135deg, #ecfeff, #38bdf8)' },
  { name: 'Rose', value: '#fecdd3', preview: 'linear-gradient(135deg, #fff1f2, #fb7185)' },
  { name: 'Gold', value: '#fde68a', preview: 'linear-gradient(135deg, #fffbeb, #f59e0b)' }
];

function AppIcon({ bookmark }: { bookmark: Pick<Bookmark, 'name' | 'url' | 'iconUrl'> }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [bookmark.iconUrl]);
  return bookmark.iconUrl && !failed ? <img className="h-full w-full object-cover" src={bookmark.iconUrl} alt="" onError={() => setFailed(true)} /> : <span className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500 to-violet-700 text-base font-bold text-white">{initials(bookmark.name || hostname(bookmark.url))}</span>;
}

function TileContent({ bookmark }: { bookmark: Bookmark }) { return <><span className="tile-icon"><AppIcon bookmark={bookmark} /></span><span className="tile-name" title={bookmark.name}>{bookmark.name}</span></>; }

function SortableTile({ bookmark, openInNewTab, onEdit, onDelete }: { bookmark: Bookmark; openInNewTab: boolean; onEdit: (bookmark: Bookmark) => void; onDelete: (bookmark: Bookmark) => void }) {
  const t = useCopy();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bookmark.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative min-w-0 ${isDragging ? 'opacity-25' : ''}`} {...attributes} {...listeners}>
    <a className="tile w-full" href={bookmark.url} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined} onClick={event => event.preventDefault()} aria-label={t.open(bookmark.name)}><TileContent bookmark={bookmark} /></a>
    <div className="tile-actions"><button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onEdit(bookmark); }} aria-label={t.edit(bookmark.name)}>✎</button><button type="button" className="delete-tile" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onDelete(bookmark); }} aria-label={t.delete(bookmark.name)}>🗑</button></div>
  </div>;
}

function BookmarkModal({ initial, onClose, onSave, onDelete }: { initial?: Bookmark; onClose: () => void; onSave: (bookmark: Bookmark) => void; onDelete?: () => void }) {
  const t = useCopy();
  const [form, setForm] = useState<Form>(() => initial ? { id: initial.id, url: initial.url, name: initial.name, iconUrl: initial.iconUrl || '', nameTouched: true, iconTouched: true } : blankForm());
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle'); const [error, setError] = useState('');
  const set = (patch: Partial<Form>) => setForm(current => ({ ...current, ...patch }));
  const lookup = async () => { if (!form.url.trim()) return; setStatus('loading'); setError(''); try { const response = await fetch('/api/metadata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: form.url.trim() }) }); const data = await response.json() as { title?: string; faviconUrl?: string; error?: string }; if (!response.ok) throw new Error(data.error || 'Không thể lấy metadata.'); setForm(current => ({ ...current, name: current.nameTouched ? current.name : data.title || current.name, iconUrl: current.iconTouched ? current.iconUrl : data.faviconUrl || current.iconUrl })); setStatus('idle'); } catch (reason) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'Không thể lấy metadata.'); } };
  const submit = (event: React.FormEvent) => { event.preventDefault(); let url: URL; try { url = new URL(form.url.trim()); } catch { setStatus('error'); setError(t.invalidUrl); return; } if (!['http:', 'https:'].includes(url.protocol)) { setStatus('error'); setError(t.httpOnly); return; } onSave({ id: form.id || crypto.randomUUID(), name: form.name.trim() || hostname(url.href), url: url.href, iconUrl: form.iconUrl.trim() || null, createdAt: initial?.createdAt || new Date().toISOString() }); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="modal-title">{initial ? t.editApp : t.addAppTitle}</h2><button className="close" onClick={onClose} aria-label={t.close}><span>×</span></button></div><form onSubmit={submit} className="mt-6 space-y-4"><label>URL<input autoFocus required type="url" placeholder="https://example.com" value={form.url} onChange={event => set({ url: event.target.value })} onBlur={lookup} /></label><p className="hint">{status === 'loading' ? t.loadingMetadata : status === 'error' ? error : t.metadataHint}</p><label>{t.appName}<input placeholder={t.appName} value={form.name} onChange={event => set({ name: event.target.value, nameTouched: true })} /></label><label>{t.iconUrl}<input type="url" placeholder="https://example.com/favicon.ico" value={form.iconUrl} onChange={event => set({ iconUrl: event.target.value, iconTouched: true })} /></label><div className="flex items-center justify-between gap-3 pt-2">{onDelete ? <button type="button" className="delete-button" onClick={onDelete}>{t.deleteApp}</button> : <span />}<div className="flex gap-3"><button type="button" className="secondary" onClick={onClose}>{t.cancel}</button><button type="submit" className="primary">{initial ? t.saveChanges : t.addToGrid}</button></div></div></form></section></div>;
}

function BackgroundDialog({ appearance, onClose, onChange }: { appearance: BackgroundAppearance; onClose: () => void; onChange: (appearance: BackgroundAppearance) => void }) {
  const t = useCopy();
  const [error, setError] = useState('');
  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Chỉ hỗ trợ tệp hình ảnh.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('Ảnh phải nhỏ hơn 3 MB để có thể lưu trong trình duyệt.'); return; }
    const reader = new FileReader();
    reader.onload = () => { try { onChange({ ...appearance, background: `url("${String(reader.result)}")` }); setError(''); } catch { setError('Không thể lưu ảnh này trong trình duyệt.'); } };
    reader.readAsDataURL(file);
  };
  return <div className="background-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="modal background-dialog" role="dialog" aria-modal="true" aria-labelledby="background-title" onMouseDown={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="background-title">{t.changeTheme}</h2><button className="close" onClick={onClose} aria-label={t.close}><span>×</span></button></div><p className="mt-2 text-sm text-slate-400">{t.themeDescription}</p><h3 className="theme-section-title">{t.background}</h3><div className="background-options"><button type="button" className={`background-option ${appearance.background === null ? 'selected' : ''}`} onClick={() => onChange({ ...appearance, background: null })}><span className="background-preview default-preview" /><span>{t.default}</span></button>{BACKGROUNDS.map(background => <button type="button" key={background.name} className={`background-option ${appearance.background === background.value ? 'selected' : ''}`} onClick={() => onChange({ ...appearance, background: background.value })}><span className="background-preview" style={{ backgroundImage: background.value }} /><span>{background.name}</span></button>)}</div><div className="slider-group"><label>{t.brightness} <output>{appearance.brightness.toFixed(2)}</output><input type="range" min="0.2" max="1" step="0.05" value={appearance.brightness} onChange={event => onChange({ ...appearance, brightness: Number(event.target.value) })} /></label><label>{t.blur} <output>{appearance.blur}px</output><input type="range" min="0" max="16" step="1" value={appearance.blur} onChange={event => onChange({ ...appearance, blur: Number(event.target.value) })} /></label></div><label className="upload-background">{t.uploadImage}<input type="file" accept="image/*" onChange={upload} /></label><h3 className="theme-section-title">{t.textColor}</h3><div className="text-color-options">{TEXT_COLORS.map(color => <button type="button" key={color.name} className={`text-color-option ${appearance.textColor === color.value ? 'selected' : ''}`} onClick={() => onChange({ ...appearance, textColor: color.value })}><span style={{ backgroundImage: color.preview }} /><span>{color.name}</span></button>)}<label className="custom-text-color"><input type="color" value={appearance.textColor} onChange={event => onChange({ ...appearance, textColor: event.target.value })} /><span>{t.custom}</span></label></div>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}</section></div>;
}

function SyncDialog({ bookmarks, text, onClose, onImport }: { bookmarks: Bookmark[]; text: (typeof SYNC_COPY)['vi']; onClose: () => void; onImport: (items: Bookmark[]) => void }) {
  const [error, setError] = useState('');
  const exportJson = () => { const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/vnd.app-shelf+json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'bookmarks.app-shelf'; link.click(); URL.revokeObjectURL(url); };
  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { if (!file.name.toLowerCase().endsWith('.app-shelf')) throw new Error(); const source = JSON.parse(await file.text()); if (!Array.isArray(source)) throw new Error(); const items = source.map((item): Bookmark => { if (!item || typeof item.url !== 'string' || typeof item.name !== 'string') throw new Error(); const url = new URL(item.url); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); return { id: typeof item.id === 'string' ? item.id : crypto.randomUUID(), name: item.name.trim() || hostname(url.href), url: url.href, iconUrl: typeof item.iconUrl === 'string' ? item.iconUrl : null, createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString() }; }); onImport(items); onClose(); } catch { setError(text.invalid); } };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="sync-popup" role="dialog" aria-label={text.sync} onMouseDown={event => event.stopPropagation()}><button type="button" onClick={exportJson}>⇩ {text.export}</button><label>⇧ {text.import}<input type="file" accept=".app-shelf,application/vnd.app-shelf+json" onChange={importJson} /></label>{error && <p>{error}</p>}</section></div>;
}

function ClearAllDialog({ text, onClose, onConfirm }: { text: (typeof SYNC_COPY)['vi']; onClose: () => void; onConfirm: () => void }) {
  const t = useCopy();
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="confirm-dialog" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}><h2>{text.title}</h2><p>{text.description}</p><div><button className="secondary" onClick={onClose}>{t.cancel}</button><button className="danger-primary" onClick={onConfirm}>{text.confirm}</button></div></section></div>;
}

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  const [draft, setDraft] = useState<Bookmark[] | null>(null);
  const [editing, setEditing] = useState<Bookmark | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false); const [activeId, setActiveId] = useState<string | null>(null);
  const [openInNewTab, setOpenInNewTab] = useState(readOpenInNewTab);
  const [language, setLanguage] = useState(readLanguage);
  const [syncOpen, setSyncOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const t = COPY[language];
  const syncText = SYNC_COPY[language];
  const [appearance, setAppearance] = useState<BackgroundAppearance>(readBackgroundAppearance);
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const editMode = draft !== null; const visibleBookmarks = draft ?? bookmarks;
  useEffect(() => saveBookmarks(bookmarks), [bookmarks]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const changeBackground = (value: BackgroundAppearance) => { try { saveBackgroundAppearance(value); setAppearance(value); } catch { window.alert('Không đủ dung lượng trình duyệt để lưu hình nền này.'); } };
  const changeOpenInNewTab = (value: boolean) => { saveOpenInNewTab(value); setOpenInNewTab(value); };
  const toggleLanguage = () => { const next = language === 'vi' ? 'en' : 'vi'; saveLanguage(next); setLanguage(next); };
  const activeBookmark = useMemo(() => visibleBookmarks.find(item => item.id === activeId) ?? null, [activeId, visibleBookmarks]);
  const updateList = (bookmark: Bookmark) => { if (editMode) setDraft(items => items ? (items.some(item => item.id === bookmark.id) ? items.map(item => item.id === bookmark.id ? bookmark : item) : [...items, bookmark]) : items); else setBookmarks(items => items.some(item => item.id === bookmark.id) ? items.map(item => item.id === bookmark.id ? bookmark : item) : [...items, bookmark]); setEditing(undefined); };
  const remove = (bookmark: Bookmark) => { if (!window.confirm(t.confirmDelete(bookmark.name))) return; if (editMode) setDraft(items => items?.filter(item => item.id !== bookmark.id) ?? null); else setBookmarks(items => items.filter(item => item.id !== bookmark.id)); setEditing(undefined); };
  const dragEnd = ({ active, over }: DragEndEvent) => { setActiveId(null); if (!over || active.id === over.id) return; setDraft(items => { if (!items) return items; const from = items.findIndex(item => item.id === active.id); const to = items.findIndex(item => item.id === over.id); return arrayMove(items, from, to); }); };
  const enterEdit = () => { setDraft(bookmarks); setSettingsOpen(false); };
  const saveEdit = () => { if (draft) setBookmarks(draft); setDraft(null); };
  const cancelEdit = () => { setDraft(null); setEditing(undefined); setSyncOpen(false); setClearAllOpen(false); };
  const importBookmarks = (incoming: Bookmark[]) => setDraft(items => { const current = items ?? []; const byUrl = new Map(current.map(item => [item.url, item])); incoming.forEach(item => { const existing = byUrl.get(item.url); byUrl.set(item.url, existing ? { ...item, id: existing.id } : item); }); const currentUrls = new Set(current.map(item => item.url)); return [...current.map(item => byUrl.get(item.url)!), ...[...byUrl.entries()].filter(([url]) => !currentUrls.has(url)).map(([, item]) => item)]; });
  const backgroundImage = appearance.background ?? BACKGROUNDS[0].value;
  const isUploadedImage = backgroundImage.startsWith('url(');
  return <CopyContext.Provider value={t}><main className="app-shell min-h-screen px-5 py-8 sm:px-10 lg:px-16" style={{ '--app-text-color': appearance.textColor } as React.CSSProperties}><div className="background-layer" style={{ backgroundImage, backgroundSize: isUploadedImage ? 'cover' : undefined, backgroundPosition: isUploadedImage ? 'center' : undefined, filter: `brightness(${appearance.brightness}) blur(${appearance.blur}px)` }} /><div className="app-content"><header className="mb-10 flex items-end justify-between gap-4"><div><p className="eyebrow">{t.eyebrow}</p><h1>App Shelf</h1><p className="subtitle">{t.tagline}</p></div><div className="header-actions"><span className="count">{t.apps(visibleBookmarks.length)}</span>{editMode && <><button className="save-button" onClick={saveEdit}>{t.save}</button><button className="cancel-edit-button" onClick={cancelEdit}>{t.cancel}</button></>}<button className="settings-button" type="button" aria-label={t.settings} onClick={() => setSettingsOpen(open => !open)}>⚙</button></div></header>
    {settingsOpen && <div className="settings-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="settings-popup" role="dialog" aria-label={t.settings} onMouseDown={event => event.stopPropagation()}><p>{t.settings}</p><button onClick={enterEdit}>{t.editList} <span>›</span></button><button onClick={() => { setSettingsOpen(false); setBackgroundDialogOpen(true); }}>{t.changeTheme} <span>›</span></button><label className="settings-checkbox">{t.openInNewTab}<input type="checkbox" checked={openInNewTab} onChange={event => changeOpenInNewTab(event.target.checked)} /></label><div className="language-switcher"><span>{t.language}</span><div><button type="button" onClick={toggleLanguage} aria-label="Previous language"><span>‹</span></button><span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span><button type="button" onClick={toggleLanguage} aria-label="Next language"><span>›</span></button></div></div></section></div>}
    {editMode ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))} onDragEnd={dragEnd}><SortableContext items={visibleBookmarks.map(item => item.id)}><section className="app-grid edit-grid" aria-label={t.editList}>{visibleBookmarks.map(bookmark => <SortableTile key={bookmark.id} bookmark={bookmark} openInNewTab={openInNewTab} onEdit={setEditing} onDelete={remove} />)}<button className="add-tile" type="button" onClick={() => setEditing(null)}><span className="plus">+</span><span className="tile-name">{t.addApp}</span></button><button className="add-tile sync-tile" type="button" onClick={() => setSyncOpen(true)}><span className="plus">↻</span><span className="tile-name">{syncText.sync}</span></button><button className="add-tile clear-all-tile" type="button" onClick={() => setClearAllOpen(true)}><span className="plus">×</span><span className="tile-name">{syncText.clearAll}</span></button></section></SortableContext><DragOverlay>{activeBookmark ? <div className="drag-overlay"><TileContent bookmark={activeBookmark} /></div> : null}</DragOverlay></DndContext> : <section className="app-grid" aria-label={t.apps(visibleBookmarks.length)}>{visibleBookmarks.map(bookmark => <a key={bookmark.id} className="tile w-full" href={bookmark.url} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined} aria-label={t.open(bookmark.name)}><TileContent bookmark={bookmark} /></a>)}<button className="add-tile" type="button" onClick={() => setEditing(null)}><span className="plus">+</span><span className="tile-name">{t.addApp}</span></button></section>}
    {editing !== undefined && <BookmarkModal initial={editing || undefined} onClose={() => setEditing(undefined)} onSave={updateList} onDelete={editing ? () => remove(editing) : undefined} />}{backgroundDialogOpen && <BackgroundDialog appearance={appearance} onClose={() => setBackgroundDialogOpen(false)} onChange={changeBackground} />}{syncOpen && <SyncDialog bookmarks={visibleBookmarks} text={syncText} onClose={() => setSyncOpen(false)} onImport={importBookmarks} />}{clearAllOpen && <ClearAllDialog text={syncText} onClose={() => setClearAllOpen(false)} onConfirm={() => { setDraft([]); setClearAllOpen(false); }} />}</div></main></CopyContext.Provider>;
}
