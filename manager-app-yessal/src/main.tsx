import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW, checkInstallPrompt } from './utils/pwa'

// Enregistrer le Service Worker pour PWA
registerSW();

// Vérifier la possibilité d'installation
checkInstallPrompt();

createRoot(document.getElementById("root")!).render(<App />);
