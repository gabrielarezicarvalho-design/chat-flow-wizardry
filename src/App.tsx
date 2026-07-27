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
import { FeatureGate } from "./components/FeatureGate";

// Eager load main pages for better UX
import Auth from "./pages/Auth";
import PublicForm from "./pages/PublicForm";
import FlowForm from "./pages/FlowForm";
import BetaLanding from "./pages/BetaLanding";
import Landing from "./pages/Landing";

// Lazy load heavier pages
const Home = lazy(() => import("./pages/Home"));
const Conversations = lazy(() => import("./pages/Conversations"));
const MassSending = lazy(() => import("./pages/MassSending"));
const Users = lazy(() => import("./pages/Users"));

// Admin pages - separate login flow
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ConnectQR = lazy(() => import("./pages/ConnectQR"));

// Lazy load other pages
const Agents = lazy(() => import("./pages/Agents"));
const Departments = lazy(() => import("./pages/Departments"));
const URAs = lazy(() => import("./pages/URAs"));
const FlowsList = lazy(() => import("./pages/FlowsList"));
const FlowBuilder = lazy(() => import("./pages/FlowBuilder"));
const Connections = lazy(() => import("./pages/Connections"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Settings = lazy(() => import("./pages/Settings"));
const TestWebhook = lazy(() => import("./pages/TestWebhook"));

const AttendancePanel = lazy(() => import("./pages/AttendancePanel"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AttendanceReports = lazy(() => import("./pages/AttendanceReports"));
const AITickets = lazy(() => import("./pages/AITickets"));
const InternalChat = lazy(() => import("./pages/InternalChat"));
const AutoProspecting = lazy(() => import("./pages/AutoProspecting"));
const CampaignReports = lazy(() => import("./pages/CampaignReports"));
const ChatHistory = lazy(() => import("./pages/ChatHistory"));
const Segmentation = lazy(() => import("./pages/Segmentation"));
const GoogleMapsLeads = lazy(() => import("./pages/GoogleMapsLeads"));
const InstagramLeads = lazy(() => import("./pages/InstagramLeads"));
const FacebookAdsSpy = lazy(() => import("./pages/FacebookAdsSpy"));
const TikTokLeads = lazy(() => import("./pages/TikTokLeads"));
const ImageDesigner = lazy(() => import("./pages/ImageDesigner"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const MyAccount = lazy(() => import("./pages/MyAccount"));
const Checkout = lazy(() => import("./pages/Checkout"));

const ChatGPTCredits = lazy(() => import("./pages/ChatGPTCredits"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfService"));
const CookiesPage = lazy(() => import("./pages/Cookies"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenter"));
const DataDeletionPage = lazy(() => import("./pages/DataDeletion"));

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
                {/* WelcomePopup removed */}
                <MultiSessionAlert />
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    {/* Admin routes - separate login flow */}
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    {/* Public form routes - no auth required */}
                    <Route path="/f/:token" element={<PublicForm />} />
                    <Route path="/form/:formId" element={<FlowForm />} />
                    {/* Public connect QR page */}
                    <Route path="/connect/:id" element={<Suspense fallback={<Loading />}><ConnectQR /></Suspense>} />
                    {/* Beta landing page - no auth required */}
                    <Route path="/testar-beta" element={<BetaLanding />} />
                    <Route path="/beta-obrigado" element={<BetaThankYou />} />
                    {/* Public policy pages - no auth required */}
                    <Route path="/politica-de-privacidade" element={<Suspense fallback={<Loading />}><PrivacyPolicyPage /></Suspense>} />
                    <Route path="/termos-de-servico" element={<Suspense fallback={<Loading />}><TermsOfServicePage /></Suspense>} />
                    <Route path="/politica-de-cookies" element={<Suspense fallback={<Loading />}><CookiesPage /></Suspense>} />
                   <Route path="/exclusao-de-dados" element={<Suspense fallback={<Loading />}><DataDeletionPage /></Suspense>} />
                   <Route path="/checkout" element={<Suspense fallback={<Loading />}><Checkout /></Suspense>} />
                    {/* Conversations with no padding - gated by chat feature */}
                    <Route
                      path="/conversations"
                      element={
                        <ProtectedRoute>
                          <MainLayout noPadding>
                            <FeatureGate feature="chat">
                              <Conversations />
                            </FeatureGate>
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
                                <Route path="/home" element={<Home />} />
                                <Route path="/agents" element={<Agents />} />
                                
                                <Route path="/departments" element={<Departments />} />
                                <Route path="/uras" element={<URAs />} />
                                <Route path="/flows" element={<FlowsList />} />
                                <Route path="/flow-builder" element={<FlowBuilder />} />
                                <Route path="/flow-builder/:id" element={<FlowBuilder />} />
                                <Route path="/connections" element={<Connections />} />
                                <Route path="/contacts" element={<Contacts />} />
                                <Route path="/mass-sending" element={<MassSending />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/attendance" element={<AttendancePanel />} />
                                <Route path="/agent-dashboard" element={<AgentDashboard />} />
                                <Route path="/attendance-reports" element={<AttendanceReports />} />
                                <Route path="/ai-tickets" element={<AITickets />} />
                                <Route path="/internal-chat" element={<InternalChat />} />
                                <Route path="/auto-prospecting" element={<AutoProspecting />} />
                                <Route path="/campaign-reports" element={<CampaignReports />} />
                                <Route path="/chat-history" element={<ChatHistory />} />
                                <Route path="/chatgpt-credits" element={<ChatGPTCredits />} />
                                <Route path="/segmentation" element={<Segmentation />} />
                                <Route path="/google-maps-leads" element={<GoogleMapsLeads />} />
                                <Route path="/instagram-leads" element={<InstagramLeads />} />
                                <Route path="/facebook-ads-spy" element={<FacebookAdsSpy />} />
                                <Route path="/tiktok-leads" element={<TikTokLeads />} />
                                <Route path="/image-designer" element={<ImageDesigner />} />
                                <Route path="/vendas" element={<Vendas />} />
                                <Route path="/pagamentos" element={<Pagamentos />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/account" element={<MyAccount />} />
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
