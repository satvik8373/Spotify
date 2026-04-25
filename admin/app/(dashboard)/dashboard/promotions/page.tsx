'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Megaphone, Plus, Edit, Trash2, ImageIcon, Loader2, X, Check, Film, Music, Globe, Smartphone, Image } from 'lucide-react';

type MediaType = 'image' | 'gif' | 'video' | 'audio';
type Platform  = 'web' | 'app';

interface Promotion {
  id: string;
  title: string;
  description: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  platforms?: Platform;
  status: 'active' | 'scheduled' | 'ended';
  startDate?: string;
  endDate?: string;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  mediaUrl: '',
  platforms: 'web' as Platform,
  status: 'active' as 'active' | 'scheduled' | 'ended',
  startDate: '',
  endDate: '',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  ended: 'bg-gray-100 text-gray-600',
};

const PLATFORM_OPTIONS: { value: Platform; label: string; icon: React.ReactNode }[] = [
  { value: 'web', label: 'Web', icon: <Globe className="h-4 w-4" /> },
  { value: 'app', label: 'App', icon: <Smartphone className="h-4 w-4" /> },
];

/** Detect media type purely from URL */
function detectMediaType(url: string): MediaType {
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|avi|mkv)$/.test(clean)) return 'video';
  if (/\.(mp3|ogg|wav|aac|flac|m4a)$/.test(clean)) return 'audio';
  if (/\.gif$/.test(clean)) return 'gif';
  return 'image';
}

function MediaTypeIcon({ type }: { type: MediaType }) {
  if (type === 'video') return <Film className="h-4 w-4 text-blue-500" />;
  if (type === 'audio') return <Music className="h-4 w-4 text-purple-500" />;
  if (type === 'gif')   return <Image className="h-4 w-4 text-pink-500" />;
  return <ImageIcon className="h-4 w-4 text-gray-400" />;
}

function MediaPreview({ url, type }: { url: string; type: MediaType }) {
  if (!url) return null;
  if (type === 'image' || type === 'gif')
    return <img src={url} alt="preview" className="h-16 w-24 rounded-lg object-cover flex-shrink-0" />;
  if (type === 'video')
    return <video src={url} className="h-16 w-24 rounded-lg object-cover flex-shrink-0" muted playsInline />;
  return (
    <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
      <Music className="h-6 w-6 text-purple-500" />
    </div>
  );
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [editId, setEditId]         = useState<string | null>(null);

  useEffect(() => { fetchPromotions(); }, []);

  async function fetchPromotions() {
    try {
      const snap = await getDocs(collection(db, 'promotions'));
      setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Promotion[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const url = form.mediaUrl.trim();
      const data = {
        title:       form.title.trim(),
        description: form.description.trim(),
        mediaUrl:    url || undefined,
        mediaType:   url ? detectMediaType(url) : undefined,
        platforms:   form.platforms,
        status:      form.status,
        startDate:   form.startDate || undefined,
        endDate:     form.endDate   || undefined,
        updatedAt:   serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, 'promotions', editId), data);
        setPromotions(prev => prev.map(p => p.id === editId ? { ...p, ...data, id: editId } : p));
      } else {
        const ref = await addDoc(collection(db, 'promotions'), { ...data, createdAt: serverTimestamp() });
        setPromotions(prev => [{ id: ref.id, ...data } as Promotion, ...prev]);
      }
      closeModal();
    } catch (e: any) { setError(e.message || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this promotion?')) return;
    await deleteDoc(doc(db, 'promotions', id));
    setPromotions(prev => prev.filter(p => p.id !== id));
  }

  function openEdit(p: Promotion) {
    setEditId(p.id);
    setForm({
      title:       p.title,
      description: p.description || '',
      mediaUrl:    p.mediaUrl    || '',
      platforms:   p.platforms   || 'web',
      status:      p.status,
      startDate:   p.startDate   || '',
      endDate:     p.endDate     || '',
    });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setForm(EMPTY_FORM); setEditId(null); setError(''); }

  // Live-detect type as user types URL
  const detectedType = form.mediaUrl ? detectMediaType(form.mediaUrl) : null;

  const platformBadge = (p?: Platform) => p === 'app'
    ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700"><Smartphone className="h-3 w-3" />App</span>
    : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700"><Globe className="h-3 w-3" />Web</span>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage banners and promotional campaigns</p>
        </div>
        <button onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Promotion
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">All Promotions ({promotions.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No promotions yet</p>
            <p className="mt-1 text-xs text-gray-500">Create your first promotional banner</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {promotions.map(promo => (
              <div key={promo.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                {promo.mediaUrl
                  ? <MediaPreview url={promo.mediaUrl} type={promo.mediaType || 'image'} />
                  : <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100"><ImageIcon className="h-6 w-6 text-gray-400" /></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{promo.title}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[promo.status] || STATUS_STYLES.ended}`}>{promo.status}</span>
                    {promo.mediaType && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        <MediaTypeIcon type={promo.mediaType} />{promo.mediaType}
                      </span>
                    )}
                    {platformBadge(promo.platforms)}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{promo.description}</p>
                  {(promo.startDate || promo.endDate) && (
                    <p className="mt-0.5 text-xs text-gray-400">{promo.startDate}{promo.endDate ? ` → ${promo.endDate}` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(promo)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(promo.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">{editId ? 'Edit Promotion' : 'Create Promotion'}</h2>
              <button onClick={closeModal} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input className="input-field" placeholder="Promotion title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Short description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Show On</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORM_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, platforms: opt.value }))}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.platforms === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Media URL</label>
                <input className="input-field" placeholder="https://... (image, gif, video, audio)" value={form.mediaUrl} onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))} />
                {detectedType && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                    <MediaTypeIcon type={detectedType} />
                    Detected: <span className="font-medium capitalize">{detectedType}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ended">Ended</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
