import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from './utils/pwa'

// Enregistrer le Service Worker pour PWA
registerSW();

createRoot(document.getElementById("root")!).render(<App />);
