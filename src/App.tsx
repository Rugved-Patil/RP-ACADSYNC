
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassroomsManagement from "./pages/ClassroomsManagement";
import Timetables from "./pages/Timetables";
import Teachers from "./pages/Teachers";
import Subjects from "./pages/Subjects";
import Timings from "./pages/Timings";
import Share from "./pages/Share";
import DataUpload from "./pages/DataUpload";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

// No login gate: this app runs entirely on your own machine, so it opens
// straight to the dashboard as a single local admin user.
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classrooms" element={<ClassroomsManagement />} />
              <Route path="/timetables" element={<Timetables />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/timings" element={<Timings />} />
              <Route path="/share" element={<Share />} />
              <Route path="/upload" element={<DataUpload />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
