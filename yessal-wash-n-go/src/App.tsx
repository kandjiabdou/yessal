
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import TransactionDetail from "./pages/TransactionDetail";
import Profile from "./pages/Profile";
import PickupRequest from "./pages/PickupRequest";
import PickupDetail from "./pages/PickupDetail";
import WebView from "./pages/WebView";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/transaction/:id" element={<TransactionDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/pickup" element={<PickupRequest />} />
          <Route path="/pickup/new" element={<PickupRequest />} />
          <Route path="/pickup/:id" element={<PickupDetail />} />
          <Route path="/website" element={<WebView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
