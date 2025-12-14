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
import LegacyRedirect from "./components/navigation/LegacyRedirect";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import NewOrder from "./pages/NewOrder";
import OrderRecap from "./pages/OrderRecap";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Clients from "./pages/Clients";
import Depenses from "./pages/Depenses";
import Bilan from "./pages/Bilan";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
// Import des pages admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSites from "./pages/admin/AdminSites";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDeliveries from "./pages/admin/AdminDeliveries";
import AdminOrders from "./pages/admin/AdminOrders";
// Import des pages boutique
import ShopDashboard from "./pages/shop/ShopDashboard";
import ShopSales from "./pages/shop/ShopSales";
import ShopProducts from "./pages/shop/ShopProducts";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              {/* Routes Manager - Module Laverie */}
              <Route path="/laverie/dashboard" element={<Dashboard />} />
              <Route path="/laverie/search" element={<Search />} />
              <Route path="/laverie/new-order" element={<NewOrder />} />
              <Route path="/laverie/order-recap" element={<OrderRecap />} />
              <Route path="/laverie/orders" element={<Orders />} />
              <Route path="/laverie/order-details" element={<OrderDetail />} />
              
              {/* Routes Manager - Module Boutique */}
              <Route path="/shop/dashboard" element={<ShopDashboard />} />
              <Route path="/shop/search" element={<ShopSales />} />
              <Route path="/shop/products" element={<ShopProducts />} />
              
              {/* Routes Manager - Autres modules */}
              <Route path="/clients" element={<Clients />} />
              <Route path="/depenses" element={<Depenses />} />
              <Route path="/bilan" element={<Bilan />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Redirections pour compatibilité - anciennes routes */}
              <Route path="/dashboard" element={<LegacyRedirect />} />
              <Route path="/search" element={<LegacyRedirect />} />
              <Route path="/new-order" element={<LegacyRedirect />} />
              <Route path="/order-recap" element={<LegacyRedirect />} />
              <Route path="/orders" element={<LegacyRedirect />} />
              <Route path="/order-details" element={<LegacyRedirect />} />
              
              {/* Routes Admin */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/sites" element={<AdminSites />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/deliveries" element={<AdminDeliveries />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
