import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/toast.css';

import AppLayout from "./components/layout/AppLayout";
import PrivateRoute from "./components/auth/PrivateRoute";
import AuthRedirect from "./components/auth/AuthRedirect";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Depenses from "./pages/Depenses";
import Bilan from "./pages/Bilan";
import Parametre from "./pages/Parametres";
import AddFlux from "./pages/AddFlux";

import NotFound from "./pages/NotFound";
// Preload audio file for notifications
const notificationSound = new Audio('/notification.mp3');
const preloadAudio = () => {
  notificationSound.load();
  document.removeEventListener('click', preloadAudio);
};

// Add event listener to preload audio after user interaction
document.addEventListener('click', preloadAudio);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <PWAInstallPrompt />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              {/* Routes Associe - Module Laverie */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Routes Associe - Autres modules */}
              <Route path="/depenses" element={<Depenses />} />
              <Route path="/nouveau" element={<AddFlux />} />
              <Route path="/bilan" element={<Bilan />} />
              <Route path="/parametres" element={<Parametre />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
