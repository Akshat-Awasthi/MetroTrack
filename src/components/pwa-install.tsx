import React, { useEffect, useState } from 'react';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;

const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }

    // Listen for install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobile()) setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: '#1E88E5',
      color: 'white',
      padding: '12px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <button
        onClick={handleInstall}
        style={{
          background: 'white',
          color: '#1E88E5',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Install App
      </button>
    </div>
  );
};

export default PWAInstallBanner;