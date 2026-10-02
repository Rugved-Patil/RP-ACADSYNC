import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Login from "./pages/Login";
import ChangeRequests from "./pages/ChangeRequests";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { authService, UserRole } from "./services/authService";
import ChatbotWidget from "./components/chat/ChatbotWidget";

const queryClient = new QueryClient();

// Helper to redirect logged-in users away from /login
const LoginRoute: React.FC = () => {
  if (authService.isAuthenticated()) {
    const user = authService.getUser();
    return <Navigate to={user?.role === "admin" ? "/" : "/timetables"} replace />;
  }
  return <Login />;
};

// Helper for protected routes with shell layout
interface ProtectedShellProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedShell: React.FC<ProtectedShellProps> = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

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
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginRoute />} />

            {/* Admin-only Routes */}
            <Route
              path="/share"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <Share />
                </ProtectedShell>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <Dashboard />
                </ProtectedShell>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <Classes />
                </ProtectedShell>
              }
            />
            <Route
              path="/classrooms"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <ClassroomsManagement />
                </ProtectedShell>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <Teachers />
                </ProtectedShell>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <Subjects />
                </ProtectedShell>
              }
            />
            <Route
              path="/timings"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <Timings />
                </ProtectedShell>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedShell allowedRoles={["admin"]}>
                  <DataUpload />
                </ProtectedShell>
              }
            />

            {/* Multi-role Protected Routes (Admin, Teacher, Student) */}
            <Route
              path="/timetables"
              element={
                <ProtectedShell allowedRoles={["admin", "teacher", "student"]}>
                  <Timetables />
                </ProtectedShell>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedShell allowedRoles={["admin", "teacher"]}>
                  <ChangeRequests />
                </ProtectedShell>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedShell allowedRoles={["admin", "teacher", "student"]}>
                  <Settings />
                </ProtectedShell>
              }
            />

            {/* Catch-all */}
            <Route
              path="*"
              element={
                <ProtectedShell>
                  <NotFound />
                </ProtectedShell>
              }
            />
          </Routes>
          <ChatbotWidget />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
