import { useState, useEffect } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  showInstallPrompt: boolean;
  isUpdateAvailable: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    showInstallPrompt: false,
    isUpdateAvailable: false,
    isIOS: false,
    showIOSInstructions: false
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Fonction pour vérifier si le prompt a été fermé récemment
  const wasRecentlyDismissed = () => {
    const dismissTime = sessionStorage.getItem('install-prompt-dismissed');
    if (!dismissTime) return false;
    
    const now = new Date().getTime();
    const timeDiff = now - parseInt(dismissTime);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Ne pas afficher si fermé dans les dernières 24 heures
    return hoursDiff < 24;
  };

  useEffect(() => {
    // Détecter iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isInWebAppiOS;

    setPwaState(prev => ({ ...prev, isInstalled, isIOS }));

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Ne montrer le prompt que si pas fermé récemment
      if (!wasRecentlyDismissed()) {
        setPwaState(prev => ({ 
          ...prev, 
          isInstallable: true, 
          showInstallPrompt: !isInstalled 
        }));
      }
    };

    // Pour iOS, afficher le prompt si pas installé et pas déjà fermé récemment
    if (isIOS && !isInstalled && !sessionStorage.getItem('ios-install-dismissed') && !wasRecentlyDismissed()) {
      // Ajouter un délai de 3 secondes pour éviter l'affichage immédiat
      setTimeout(() => {
        setPwaState(prev => ({ 
          ...prev, 
          showInstallPrompt: true,
          isInstallable: true
        }));
      }, 3000);
    }

    // Écouter l'installation réussie
    const handleAppInstalled = () => {
      setPwaState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false,
        showInstallPrompt: false 
      }));
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (pwaState.isIOS) {
      // Pour iOS, afficher les instructions
      setPwaState(prev => ({ ...prev, showIOSInstructions: true }));
      return false;
    }
    
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during installation:', error);
      return false;
    } finally {
      setDeferredPrompt(null);
      setPwaState(prev => ({ ...prev, showInstallPrompt: false }));
    }
  };

  const dismissInstallPrompt = () => {
    setPwaState(prev => ({ ...prev, showInstallPrompt: false }));
    
    // Marquer comme fermé avec timestamp pour éviter de réafficher trop souvent
    const dismissTime = new Date().getTime();
    sessionStorage.setItem('install-prompt-dismissed', dismissTime.toString());
    
    if (pwaState.isIOS) {
      sessionStorage.setItem('ios-install-dismissed', 'true');
    }
  };

  const dismissIOSInstructions = () => {
    setPwaState(prev => ({ ...prev, showIOSInstructions: false }));
    sessionStorage.setItem('ios-install-dismissed', 'true');
    
    // Aussi marquer le prompt principal comme fermé
    const dismissTime = new Date().getTime();
    sessionStorage.setItem('install-prompt-dismissed', dismissTime.toString());
  };

  return {
    ...pwaState,
    installApp,
    dismissInstallPrompt,
    dismissIOSInstructions
  };
};
