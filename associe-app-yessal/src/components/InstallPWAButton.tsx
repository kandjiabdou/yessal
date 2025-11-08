import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface InstallPWAButtonProps {
  className?: string;
}

const InstallPWAButton: React.FC<InstallPWAButtonProps> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    setIsIOS(iOS);
    setIsInStandaloneMode(standalone);

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pour iOS, vérifier si on doit afficher les instructions
    if (iOS && !standalone && !sessionStorage.getItem('ios-install-dismissed')) {
      setShowInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } else if (isIOS && !isInStandaloneMode) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    if (isIOS) {
      sessionStorage.setItem('ios-install-dismissed', 'true');
    }
  };

  const handleIOSDismiss = () => {
    setShowIOSInstructions(false);
    sessionStorage.setItem('ios-install-dismissed', 'true');
  };

  if (!showInstallPrompt || isInStandaloneMode) {
    return null;
  }

  return (
    <>
      {/* Bouton d'installation principal */}
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Installer l'app</span>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-300 mb-3">
            Accédez rapidement à associe Yessal depuis votre écran d'accueil
          </p>
          <button
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            {isIOS ? 'Voir les instructions' : 'Installer maintenant'}
          </button>
        </div>
      </div>

      {/* Instructions iOS Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Installation sur iOS
              </h3>
              <button 
                onClick={handleIOSDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-lg">1️⃣</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Appuyez sur le bouton Partager</p>
                  <p>Recherchez l'icône <Share className="w-4 h-4 inline mx-1" /> en bas de l'écran</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-lg">2️⃣</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sélectionnez "Sur l'écran d'accueil"</p>
                  <p>Faites défiler et appuyez sur "⊞ Sur l'écran d'accueil"</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-lg">3️⃣</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Confirmez l'ajout</p>
                  <p>Appuyez sur "Ajouter" en haut à droite</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleIOSDismiss}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWAButton;
