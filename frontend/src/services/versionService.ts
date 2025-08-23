export interface VersionInfo {
  version: string;
  buildTime: string;
  features?: string[];
  critical?: boolean;
  currentVersion?: string;
  updateAvailable?: boolean;
  message?: string;
}

export class VersionService {
  private static instance: VersionService;
  private currentVersion: string = '2.0.0'; // Should match package.json
  private checkInterval: number = 30 * 60 * 1000; // 30 minutes
  private lastCheck: number = 0;

  private constructor() {}

  public static getInstance(): VersionService {
    if (!VersionService.instance) {
      VersionService.instance = new VersionService();
    }
    return VersionService.instance;
  }

  public async checkForUpdates(): Promise<VersionInfo | null> {
    try {
      // Don't check too frequently
      const now = Date.now();
      if (now - this.lastCheck < this.checkInterval) {
        return null;
      }

      this.lastCheck = now;

      const response = await fetch('/api/version/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const versionData: VersionInfo = await response.json();
        
        // Check if update is available
        if (versionData.updateAvailable && versionData.version !== this.currentVersion) {
          return versionData;
        }
      }
    } catch (error) {
      console.log('Version check failed:', error);
      // Fallback: Check service worker update
      return this.checkServiceWorkerUpdate();
    }

    return null;
  }

  private checkServiceWorkerUpdate(): VersionInfo | null {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
        
        // Check if there's a new service worker waiting
        if (registration.waiting) {
          return {
            version: '2.0.0', // You can make this dynamic
            buildTime: new Date().toISOString(),
            features: ['Performance improvements', 'Bug fixes', 'New features'],
            critical: false,
            updateAvailable: true,
          };
        }
      });
    }

    return null;
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  public setCurrentVersion(version: string): void {
    this.currentVersion = version;
  }

  public async forceUpdate(): Promise<void> {
    // Reload the page to get the new version
    window.location.reload();
  }

  public async checkAndNotify(): Promise<void> {
    const updateInfo = await this.checkForUpdates();
    
    if (updateInfo) {
      // Dispatch custom event for version update
      const event = new CustomEvent('versionUpdateAvailable', {
        detail: updateInfo
      });
      document.dispatchEvent(event);
    }
  }
}

export const versionService = VersionService.getInstance();
