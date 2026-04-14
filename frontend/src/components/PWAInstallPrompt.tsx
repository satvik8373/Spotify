import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-prompt-dismissed-at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const wasRecentlyDismissed = () => {
  const ts = localStorage.getItem(DISMISS_KEY);
  return ts ? Date.now() - Number(ts) < DISMISS_COOLDOWN_MS : false;
};

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed or recently dismissed — do nothing
    if (isStandalone() || wasRecentlyDismissed()) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS doesn't fire beforeinstallprompt — show manual instructions after a delay
      const t = window.setTimeout(() => setVisible(true), 8000);
      return () => window.clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setVisible(false));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Mavrixfy"
      className="fixed bottom-0 left-0 right-0 z-[200] px-4 pb-safe"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-2xl max-w-md mx-auto">
        <img
          src="/mavrixfy-icons/mavrixfy-icon-maskable-192.png"
          alt="Mavrixfy"
          className="w-12 h-12 rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Install Mavrixfy</p>
          {isIOS ? (
            <p className="text-xs text-white/60 mt-0.5 leading-snug">
              Tap <span className="font-medium text-white/80">Share</span> then{' '}
              <span className="font-medium text-white/80">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs text-white/60 mt-0.5">Add to your home screen for the best experience</p>
          )}
        </div>
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
            aria-label="Install app"
          >
            <Download size={14} />
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-1.5 text-white/40 hover:text-white/80 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
