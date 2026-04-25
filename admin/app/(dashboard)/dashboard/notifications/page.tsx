'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Bell, Plus, Send, Users, Target, Loader2, X, Check } from 'lucide-react';

interface Notification { id: string; title: string; message: string; sentAt: any; delivered: number; opened: number; }
const EMPTY_FORM = { title: '', message: '' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sentToday: 0, totalDelivered: 0, openRate: 0 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(50)));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[];
      setNotifications(data);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const sentToday = data.filter(n => n.sentAt?.toDate?.() >= today).length;
      const totalDelivered = data.reduce((s, n) => s + (n.delivered || 0), 0);
      const totalOpened = data.reduce((s, n) => s + (n.opened || 0), 0);
      setStats({ sentToday, totalDelivered, openRate: totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSend() {
    if (!form.title.trim() || !form.message.trim()) { setError('Title and message are required.'); return; }
    setSaving(true); setError('');
    try {
      // 1. Save to Firestore
      const data = { title: form.title.trim(), message: form.message.trim(), sentAt: serverTimestamp(), delivered: 0, opened: 0, status: 'sending' };
      const ref = await addDoc(collection(db, 'notifications'), data);

      // 2. Call API to actually send FCM push
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), message: form.message.trim(), notificationId: ref.id }),
      });
      const result = await res.json();

      setNotifications(prev => [{ id: ref.id, ...data, delivered: result.delivered || 0 } as any, ...prev]);
      setStats(s => ({ ...s, sentToday: s.sentToday + 1, totalDelivered: s.totalDelivered + (result.delivered || 0) }));
      setShowModal(false); setForm(EMPTY_FORM);
    } catch (e: any) { setError(e.message || 'Failed to send.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">Send push notifications to users</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Notification
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sent Today', value: stats.sentToday, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Delivered', value: stats.totalDelivered, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Open Rate', value: `${stats.openRate}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
              </div>
              <div className={`rounded-lg p-2 ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Notifications</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No notifications sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(n => (
              <div key={n.id} className="flex items-start justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.message}</p>
                </div>
                <div className="ml-4 text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{n.sentAt?.toDate?.().toLocaleDateString()}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{n.delivered || 0} delivered</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Send Notification</h2>
              <button onClick={() => setShowModal(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input className="input-field" placeholder="Notification title" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
                <textarea className="input-field resize-none" rows={3} placeholder="Notification message..."
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSend} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
