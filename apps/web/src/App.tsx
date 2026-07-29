import { useEffect, useMemo, useState } from 'react';
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { readBackgroundAppearance, readBookmarks, saveBackgroundAppearance, saveBookmarks, type BackgroundAppearance } from './storage';
import type { Bookmark } from './types';

type Form = { id?: string; url: string; name: string; iconUrl: string; nameTouched: boolean; iconTouched: boolean };
const blankForm = (): Form => ({ url: '', name: '', iconUrl: '', nameTouched: false, iconTouched: false });
const hostname = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'App'; } };
const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || 'A';
const BACKGROUNDS = [
  { name: 'Midnight', value: 'radial-gradient(circle at 20% 0%, #312e814d, transparent 30rem), radial-gradient(circle at 90% 20%, #0e749033, transparent 25rem)' },
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

function TileContent({ bookmark }: { bookmark: Bookmark }) { return <><span className="tile-icon"><AppIcon bookmark={bookmark} /></span><span className="tile-name">{bookmark.name}</span></>; }

function SortableTile({ bookmark, onOpen, onEdit, onDelete }: { bookmark: Bookmark; onOpen: (url: string) => void; onEdit: (bookmark: Bookmark) => void; onDelete: (bookmark: Bookmark) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bookmark.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative min-w-0 ${isDragging ? 'opacity-25' : ''}`} {...attributes} {...listeners}>
    <button type="button" className="tile w-full" onClick={() => onOpen(bookmark.url)} aria-label={`Mở ${bookmark.name}`}><TileContent bookmark={bookmark} /></button>
    <div className="tile-actions"><button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onEdit(bookmark); }} aria-label={`Chỉnh sửa ${bookmark.name}`}>✎</button><button type="button" className="delete-tile" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onDelete(bookmark); }} aria-label={`Xóa ${bookmark.name}`}>🗑</button></div>
  </div>;
}

function BookmarkModal({ initial, onClose, onSave, onDelete }: { initial?: Bookmark; onClose: () => void; onSave: (bookmark: Bookmark) => void; onDelete?: () => void }) {
  const [form, setForm] = useState<Form>(() => initial ? { id: initial.id, url: initial.url, name: initial.name, iconUrl: initial.iconUrl || '', nameTouched: true, iconTouched: true } : blankForm());
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle'); const [error, setError] = useState('');
  const set = (patch: Partial<Form>) => setForm(current => ({ ...current, ...patch }));
  const lookup = async () => { if (!form.url.trim()) return; setStatus('loading'); setError(''); try { const response = await fetch('/api/metadata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: form.url.trim() }) }); const data = await response.json() as { title?: string; faviconUrl?: string; error?: string }; if (!response.ok) throw new Error(data.error || 'Không thể lấy metadata.'); setForm(current => ({ ...current, name: current.nameTouched ? current.name : data.title || current.name, iconUrl: current.iconTouched ? current.iconUrl : data.faviconUrl || current.iconUrl })); setStatus('idle'); } catch (reason) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'Không thể lấy metadata.'); } };
  const submit = (event: React.FormEvent) => { event.preventDefault(); let url: URL; try { url = new URL(form.url.trim()); } catch { setStatus('error'); setError('Nhập một URL HTTP hoặc HTTPS hợp lệ.'); return; } if (!['http:', 'https:'].includes(url.protocol)) { setStatus('error'); setError('Chỉ hỗ trợ URL HTTP hoặc HTTPS.'); return; } onSave({ id: form.id || crypto.randomUUID(), name: form.name.trim() || hostname(url.href), url: url.href, iconUrl: form.iconUrl.trim() || null, createdAt: initial?.createdAt || new Date().toISOString() }); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="modal-title">{initial ? 'Chỉnh sửa app' : 'Thêm app'}</h2><button className="close" onClick={onClose} aria-label="Đóng">×</button></div><form onSubmit={submit} className="mt-6 space-y-4"><label>URL<input autoFocus required type="url" placeholder="https://example.com" value={form.url} onChange={event => set({ url: event.target.value })} onBlur={lookup} /></label><p className="hint">{status === 'loading' ? 'Đang lấy title và favicon…' : status === 'error' ? error : 'Rời khỏi ô URL để tự điền title và favicon.'}</p><label>Tên app<input placeholder="Tên hiển thị" value={form.name} onChange={event => set({ name: event.target.value, nameTouched: true })} /></label><label>Icon URL<input type="url" placeholder="https://example.com/favicon.ico" value={form.iconUrl} onChange={event => set({ iconUrl: event.target.value, iconTouched: true })} /></label><div className="flex items-center justify-between gap-3 pt-2">{onDelete ? <button type="button" className="delete-button" onClick={onDelete}>Xóa app</button> : <span />}<div className="flex gap-3"><button type="button" className="secondary" onClick={onClose}>Hủy</button><button type="submit" className="primary">{initial ? 'Lưu thay đổi' : 'Thêm vào grid'}</button></div></div></form></section></div>;
}

function BackgroundDialog({ appearance, onClose, onChange }: { appearance: BackgroundAppearance; onClose: () => void; onChange: (appearance: BackgroundAppearance) => void }) {
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
  return <div className="background-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="modal background-dialog" role="dialog" aria-modal="true" aria-labelledby="background-title" onMouseDown={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="background-title">Đổi giao diện</h2><button className="close" onClick={onClose} aria-label="Đóng">×</button></div><p className="mt-2 text-sm text-slate-400">Chọn background, độ hiển thị và màu chữ cho app.</p><h3 className="theme-section-title">Hình nền</h3><div className="background-options"><button type="button" className={`background-option ${appearance.background === null ? 'selected' : ''}`} onClick={() => onChange({ ...appearance, background: null })}><span className="background-preview default-preview" /><span>Mặc định</span></button>{BACKGROUNDS.map(background => <button type="button" key={background.name} className={`background-option ${appearance.background === background.value ? 'selected' : ''}`} onClick={() => onChange({ ...appearance, background: background.value })}><span className="background-preview" style={{ backgroundImage: background.value }} /><span>{background.name}</span></button>)}</div><div className="slider-group"><label>Độ sáng <output>{appearance.brightness.toFixed(2)}</output><input type="range" min="0.2" max="1" step="0.05" value={appearance.brightness} onChange={event => onChange({ ...appearance, brightness: Number(event.target.value) })} /></label><label>Độ mờ <output>{appearance.blur}px</output><input type="range" min="0" max="16" step="1" value={appearance.blur} onChange={event => onChange({ ...appearance, blur: Number(event.target.value) })} /></label></div><label className="upload-background">Tải ảnh từ máy<input type="file" accept="image/*" onChange={upload} /></label><h3 className="theme-section-title">Màu chữ</h3><div className="text-color-options">{TEXT_COLORS.map(color => <button type="button" key={color.name} className={`text-color-option ${appearance.textColor === color.value ? 'selected' : ''}`} onClick={() => onChange({ ...appearance, textColor: color.value })}><span style={{ backgroundImage: color.preview }} /><span>{color.name}</span></button>)}<label className="custom-text-color"><input type="color" value={appearance.textColor} onChange={event => onChange({ ...appearance, textColor: event.target.value })} /><span>Tùy chỉnh</span></label></div>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}</section></div>;
}

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  const [draft, setDraft] = useState<Bookmark[] | null>(null);
  const [editing, setEditing] = useState<Bookmark | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false); const [activeId, setActiveId] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<BackgroundAppearance>(readBackgroundAppearance);
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const editMode = draft !== null; const visibleBookmarks = draft ?? bookmarks;
  useEffect(() => saveBookmarks(bookmarks), [bookmarks]);
  const changeBackground = (value: BackgroundAppearance) => { try { saveBackgroundAppearance(value); setAppearance(value); } catch { window.alert('Không đủ dung lượng trình duyệt để lưu hình nền này.'); } };
  const activeBookmark = useMemo(() => visibleBookmarks.find(item => item.id === activeId) ?? null, [activeId, visibleBookmarks]);
  const updateList = (bookmark: Bookmark) => { if (editMode) setDraft(items => items ? (items.some(item => item.id === bookmark.id) ? items.map(item => item.id === bookmark.id ? bookmark : item) : [...items, bookmark]) : items); else setBookmarks(items => items.some(item => item.id === bookmark.id) ? items.map(item => item.id === bookmark.id ? bookmark : item) : [...items, bookmark]); setEditing(undefined); };
  const remove = (bookmark: Bookmark) => { if (!window.confirm(`Xóa ${bookmark.name}?`)) return; if (editMode) setDraft(items => items?.filter(item => item.id !== bookmark.id) ?? null); else setBookmarks(items => items.filter(item => item.id !== bookmark.id)); setEditing(undefined); };
  const dragEnd = ({ active, over }: DragEndEvent) => { setActiveId(null); if (!over || active.id === over.id) return; setDraft(items => { if (!items) return items; const from = items.findIndex(item => item.id === active.id); const to = items.findIndex(item => item.id === over.id); return arrayMove(items, from, to); }); };
  const enterEdit = () => { setDraft(bookmarks); setSettingsOpen(false); };
  const saveEdit = () => { if (draft) setBookmarks(draft); setDraft(null); };
  const backgroundImage = appearance.background ?? BACKGROUNDS[0].value;
  const isUploadedImage = backgroundImage.startsWith('url(');
  return <main className="app-shell min-h-screen px-5 py-8 sm:px-10 lg:px-16" style={{ '--app-text-color': appearance.textColor } as React.CSSProperties}><div className="background-layer" style={{ backgroundImage, backgroundSize: isUploadedImage ? 'cover' : undefined, backgroundPosition: isUploadedImage ? 'center' : undefined, filter: `brightness(${appearance.brightness}) blur(${appearance.blur}px)` }} /><div className="app-content"><header className="mb-10 flex items-end justify-between gap-4"><div><p className="eyebrow">YOUR WEB APPS</p><h1>App Shelf</h1><p className="subtitle">Một nơi gọn gàng cho mọi tool của cậu.</p></div><div className="header-actions"><span className="count">{visibleBookmarks.length} app</span>{editMode && <button className="save-button" onClick={saveEdit}>Save</button>}<button className="settings-button" type="button" aria-label="Mở Settings" onClick={() => setSettingsOpen(open => !open)}>⚙</button></div></header>
    {settingsOpen && <div className="settings-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="settings-popup" role="dialog" aria-label="Settings" onMouseDown={event => event.stopPropagation()}><p>Settings</p><button onClick={enterEdit}>Chỉnh sửa danh sách app <span>›</span></button><button onClick={() => { setSettingsOpen(false); setBackgroundDialogOpen(true); }}>Đổi giao diện <span>›</span></button></section></div>}
    {editMode ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))} onDragEnd={dragEnd}><SortableContext items={visibleBookmarks.map(item => item.id)}><section className="app-grid edit-grid" aria-label="Chỉnh sửa danh sách ứng dụng">{visibleBookmarks.map(bookmark => <SortableTile key={bookmark.id} bookmark={bookmark} onOpen={url => window.open(url, '_blank', 'noopener,noreferrer')} onEdit={setEditing} onDelete={remove} />)}<button className="add-tile" type="button" onClick={() => setEditing(null)}><span className="plus">+</span><span className="tile-name">Thêm app</span></button></section></SortableContext><DragOverlay>{activeBookmark ? <div className="drag-overlay"><TileContent bookmark={activeBookmark} /></div> : null}</DragOverlay></DndContext> : <section className="app-grid" aria-label="Danh sách ứng dụng">{visibleBookmarks.map(bookmark => <button key={bookmark.id} type="button" className="tile w-full" onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')} aria-label={`Mở ${bookmark.name}`}><TileContent bookmark={bookmark} /></button>)}<button className="add-tile" type="button" onClick={() => setEditing(null)}><span className="plus">+</span><span className="tile-name">Thêm app</span></button></section>}
    {editing !== undefined && <BookmarkModal initial={editing || undefined} onClose={() => setEditing(undefined)} onSave={updateList} onDelete={editing ? () => remove(editing) : undefined} />}{backgroundDialogOpen && <BackgroundDialog appearance={appearance} onClose={() => setBackgroundDialogOpen(false)} onChange={changeBackground} />}</div></main>;
}
