import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import PrivateRoute from "./components/auth/PrivateRoute";
import AuthRedirect from "./components/auth/AuthRedirect";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import NewOrder from "./pages/NewOrder";
import OrderRecap from "./pages/OrderRecap";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<Search />} />
              <Route path="/new-order" element={<NewOrder />} />
              <Route path="/order-recap" element={<OrderRecap />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/order-details" element={<OrderDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
