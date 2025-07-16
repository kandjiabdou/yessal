import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Share, Plus } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallPrompt: React.FC = () => {
  const { 
    showInstallPrompt, 
    isIOS, 
    showIOSInstructions,
    installApp, 
    dismissInstallPrompt,
    dismissIOSInstructions
  } = usePWA();

  if (!showInstallPrompt) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      console.log('App installed successfully');
    }
  };

  return (
    <>
      {/* Prompt principal */}
      <Card className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 shadow-lg border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Download className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Installer Manager Yessal
              </h3>
              <p className="text-xs text-blue-700 mb-3">
                {isIOS 
                  ? "Ajoutez l'application à votre écran d'accueil pour un accès rapide."
                  : "Installez l'application sur votre appareil pour un accès rapide et une meilleure expérience."
                }
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isIOS ? 'Voir comment faire' : 'Installer'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={dismissInstallPrompt}
                  className="text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  Plus tard
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismissInstallPrompt}
              className="flex-shrink-0 h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal d'instructions iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Installation sur iPhone
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismissIOSInstructions}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                    <span className="text-lg">1️⃣</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Appuyez sur le bouton Partager</p>
                    <p className="flex items-center">
                      Recherchez l'icône <Share className="w-4 h-4 mx-1 text-blue-600" /> en bas de Safari
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                    <span className="text-lg">2️⃣</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Sélectionnez "Sur l'écran d'accueil"</p>
                    <p className="flex items-center">
                      Faites défiler et appuyez sur <Plus className="w-4 h-4 mx-1 text-green-600" /> "Sur l'écran d'accueil"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                    <span className="text-lg">3️⃣</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Confirmez l'ajout</p>
                    <p>Appuyez sur "Ajouter" en haut à droite</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Button
                  onClick={dismissIOSInstructions}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  J'ai compris
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
