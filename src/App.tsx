import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Overview from "./pages/dashboard/Overview";
import Incidents from "./pages/dashboard/Incidents";
import IncidentDetail from "./pages/dashboard/IncidentDetail";
import Metrics from "./pages/dashboard/Metrics";
import Logs from "./pages/dashboard/Logs";
import Settings from "./pages/dashboard/Settings";
import Billing from "./pages/dashboard/Billing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/dashboard/incidents" element={<Incidents />} />
          <Route path="/dashboard/incidents/:id" element={<IncidentDetail />} />
          <Route path="/dashboard/metrics" element={<Metrics />} />
          <Route path="/dashboard/logs" element={<Logs />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/billing" element={<Billing />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
