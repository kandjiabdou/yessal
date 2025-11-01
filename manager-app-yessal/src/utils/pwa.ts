// PWA Service Worker Registration
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {          
          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Une nouvelle version est disponible
                  if (confirm('Une nouvelle version est disponible. Voulez-vous la charger ?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Fonction simple pour nettoyer les anciennes bannières si elles existent
export const checkInstallPrompt = () => {
  // Cette fonction est maintenant vide car la logique d'installation
  // est gérée par le composant React PWAInstallPrompt
  console.log('PWA install prompt check - handled by React component');
};
