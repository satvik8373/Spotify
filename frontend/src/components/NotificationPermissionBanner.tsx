import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { registerWebPush, getNotificationPermission } from '@/services/webPushService';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationPermissionBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const perm = getNotificationPermission();

    if (perm === 'denied' || perm === 'unsupported') {
      setStatus(perm);
      return;
    }

    // If already granted — silently re-register to ensure fresh token in Firestore
    if (perm === 'granted') {
      registerWebPush(user.id).then(result => {
        setStatus(result.status);
      });
      return;
    }

    // 'default' — check if dismissed
    if (localStorage.getItem('notif_banner_dismissed')) {
      setDismissed(true);
    }
  }, [user?.id]);

  async function handleEnable() {
    if (!user?.id) return;
    setStatus('loading');
    const result = await registerWebPush(user.id);
    setStatus(result.status);
    if (result.status === 'granted') {
      localStorage.setItem('notif_banner_dismissed', '1');
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem('notif_banner_dismissed', '1');
  }

  // Hide if: no user, already handled, denied, unsupported, dismissed
  if (
    !user ||
    dismissed ||
    status === 'granted' ||
    status === 'denied' ||
    status === 'unsupported' ||
    status === 'loading'
  ) {
    return null;
  }

  return (
    <div className="mx-4 md:mx-6 mb-3 flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
        <Bell className="h-4 w-4 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Enable notifications</p>
        <p className="text-xs text-white/60">Get notified about new music and updates</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          className="rounded-full bg-green-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-green-400 transition-colors"
        >
          Enable
        </button>
        <button onClick={handleDismiss} className="rounded-full p-1 text-white/40 hover:text-white/70 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
