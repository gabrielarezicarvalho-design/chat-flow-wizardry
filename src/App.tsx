import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import BetaThankYou from "@/pages/BetaThankYou";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { Loading } from "./components/ui/loading";
import { WelcomePopup } from "./components/WelcomePopup";
import { MultiSessionAlert } from "./components/MultiSessionAlert";

// Eager load main pages for better UX
import Home from "./pages/Home";
import Conversations from "./pages/Conversations";
import Auth from "./pages/Auth";
import MassSending from "./pages/MassSending";
import PublicForm from "./pages/PublicForm";
import FlowForm from "./pages/FlowForm";
import SmartFormView from "./pages/SmartFormView";
import BetaLanding from "./pages/BetaLanding";
import Users from "./pages/Users";
import WhiteLabelLogin from "./pages/WhiteLabelLogin";
import WhiteLabelConfig from "./pages/WhiteLabelConfig";

// Admin pages - separate login flow
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

// Lazy load other pages
const Agents = lazy(() => import("./pages/Agents"));
const Departments = lazy(() => import("./pages/Departments"));
const URAs = lazy(() => import("./pages/URAs"));
const FlowsList = lazy(() => import("./pages/FlowsList"));
const FlowBuilder = lazy(() => import("./pages/FlowBuilder"));
const Connections = lazy(() => import("./pages/Connections"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Formularios = lazy(() => import("./pages/Formularios"));
const FormResponses = lazy(() => import("./pages/FormResponses"));
const SmartForms = lazy(() => import("./pages/SmartForms"));
const Settings = lazy(() => import("./pages/Settings"));
const TestWebhook = lazy(() => import("./pages/TestWebhook"));
const FeedbackReports = lazy(() => import("./pages/FeedbackReports"));

const AttendancePanel = lazy(() => import("./pages/AttendancePanel"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AttendanceReports = lazy(() => import("./pages/AttendanceReports"));
const AITickets = lazy(() => import("./pages/AITickets"));
const InternalChat = lazy(() => import("./pages/InternalChat"));
const AutoProspecting = lazy(() => import("./pages/AutoProspecting"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <React.Fragment>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AuthProvider>
                <WelcomePopup />
                <MultiSessionAlert />
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    {/* Admin routes - separate login flow */}
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    {/* Public form routes - no auth required */}
                    <Route path="/f/:token" element={<PublicForm />} />
                    <Route path="/form/:formId" element={<FlowForm />} />
                    <Route path="/formulario/:formId" element={<SmartFormView />} />
                    {/* Beta landing page - no auth required */}
                    <Route path="/testar-beta" element={<BetaLanding />} />
                    <Route path="/beta-obrigado" element={<BetaThankYou />} />
                    {/* White Label login - no auth required */}
                    <Route path="/entrar-white-label" element={<WhiteLabelLogin />} />
                    <Route path="/white-label-config" element={<WhiteLabelConfig />} />
                    {/* Conversations with no padding */}
                    <Route
                      path="/conversations"
                      element={
                        <ProtectedRoute>
                          <MainLayout noPadding>
                            <Conversations />
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                    {/* Other routes with standard padding */}
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <Suspense fallback={<Loading />}>
                              <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/agents" element={<Agents />} />
                                
                                <Route path="/departments" element={<Departments />} />
                                <Route path="/uras" element={<URAs />} />
                                <Route path="/flows" element={<FlowsList />} />
                                <Route path="/flow-builder" element={<FlowBuilder />} />
                                <Route path="/flow-builder/:id" element={<FlowBuilder />} />
                                <Route path="/connections" element={<Connections />} />
                                <Route path="/contacts" element={<Contacts />} />
                                <Route path="/formularios" element={<Formularios />} />
                                <Route path="/form-responses" element={<FormResponses />} />
                                <Route path="/smart-forms" element={<SmartForms />} />
                                <Route path="/mass-sending" element={<MassSending />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/attendance" element={<AttendancePanel />} />
                                <Route path="/agent-dashboard" element={<AgentDashboard />} />
                                <Route path="/attendance-reports" element={<AttendanceReports />} />
                                <Route path="/ai-tickets" element={<AITickets />} />
                                <Route path="/internal-chat" element={<InternalChat />} />
                                <Route path="/auto-prospecting" element={<AutoProspecting />} />
                                <Route path="/feedback" element={<FeedbackReports />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/test-webhook" element={<TestWebhook />} />
                                <Route path="*" element={<NotFound />} />
                                <Route path="/test-webhook" element={<TestWebhook />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </Suspense>
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.Fragment>
  );
}

export default App;
