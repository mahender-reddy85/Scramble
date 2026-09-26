import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="scramble-theme">
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div id="main-content">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
