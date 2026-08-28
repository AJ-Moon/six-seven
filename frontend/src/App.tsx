import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { Toaster } from "sonner";
// Auth guards are tiny — keep them eager so redirects work instantly
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import ChatWidget from "@/components/ChatWidget";
import { AnalyticsBridge } from "@/components/AnalyticsBridge";
import { SeoMetadata } from "@/components/SeoMetadata";

// ─── Route-level code splitting ─────────────────────────────────────────────
// Each page is loaded on demand. Initial JS bundle drops by ~60%.
const HomePage = lazy(() => import("@/pages/HomePage"));
const BranchesPage = lazy(() => import("@/pages/BranchesPage"));
const CareersPage = lazy(() => import("@/pages/CareersPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const FaqPage = lazy(() => import("@/pages/FaqPage"));
const FranchisePage = lazy(() => import("@/pages/FranchisePage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const MenuPage = lazy(() => import("@/pages/MenuPage"));
const PointsPage = lazy(() => import("@/pages/PointsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const RewardsPage = lazy(() => import("@/pages/RewardsPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const TrackPage = lazy(() => import("@/pages/TrackPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderConfirmationPage = lazy(
  () => import("@/pages/OrderConfirmationPage"),
);
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ClaimOrderPage = lazy(() => import("@/pages/ClaimOrderPage"));
const RestaurantNotFoundPage = lazy(
  () => import("@/pages/RestaurantNotFoundPage"),
);
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
// Admin
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminCurrentOrders = lazy(
  () => import("@/pages/admin/AdminCurrentOrders"),
);
const AdminFinishedOrders = lazy(
  () => import("@/pages/admin/AdminFinishedOrders"),
);
const AdminMenuPage = lazy(() => import("@/pages/admin/AdminMenuPage"));
const AdminContentPage = lazy(() => import("@/pages/admin/AdminContentPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminDashboardPage = lazy(
  () => import("@/pages/admin/AdminDashboardPage"),
);
const AdminBranchesPage = lazy(() => import("@/pages/admin/AdminBranchesPage"));
const AdminContactMessagesPage = lazy(
  () => import("@/pages/admin/AdminContactMessagesPage"),
);
const AdminRewardsPage = lazy(() => import("@/pages/admin/AdminRewardsPage"));
const AdminBrandingPage = lazy(() => import("@/pages/admin/AdminBrandingPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(
  () => import("@/pages/admin/AdminUserDetailPage"),
);
const AdminOperationsPage = lazy(() => import("@/pages/admin/AdminOperationsPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminCompetitorsPage = lazy(() => import("@/pages/admin/AdminCompetitorsPage"));
const AdminOpportunitiesPage = lazy(() => import("@/pages/admin/AdminOpportunitiesPage"));
const AdminExperimentsPage = lazy(() => import("@/pages/admin/AdminExperimentsPage"));
const AdminMissionsPage = lazy(() => import("@/pages/admin/AdminMissionsPage"));
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function TopLoadingBar() {
  const isFetching = useIsFetching();
  if (!isFetching) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/20">
      <div
        className="h-full w-1/3 rounded-full bg-primary"
        style={{ animation: "progress-slide 1.4s ease-in-out infinite" }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="flavor-hub-theme">
      <BrowserRouter>
        <SeoMetadata />
        <AnalyticsBridge />
        <TopLoadingBar />
        <Toaster richColors position="top-right" />
        <ServiceStatusBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<Navigate to="/" replace />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/franchise" element={<FranchisePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/order-confirmation/:orderId"
              element={<OrderConfirmationPage />}
            />
            {/* Reached when a customer opens a confirmation link with no order id */}
            <Route
              path="/order-confirmation"
              element={<Navigate to="/track" replace />}
            />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/claim-order" element={<ClaimOrderPage />} />
            <Route
              path="/restaurant-not-found"
              element={<RestaurantNotFoundPage />}
            />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<AdminProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="orders/current" element={<AdminCurrentOrders />} />
                <Route
                  path="orders/finished"
                  element={<AdminFinishedOrders />}
                />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:userId" element={<AdminUserDetailPage />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="branches" element={<AdminBranchesPage />} />
                <Route
                  path="contact-messages"
                  element={<AdminContactMessagesPage />}
                />
                <Route path="rewards" element={<AdminRewardsPage />} />
                <Route path="branding" element={<AdminBrandingPage />} />
                <Route path="content" element={<AdminContentPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="operations" element={<AdminOperationsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="competitors" element={<AdminCompetitorsPage />} />
                <Route path="opportunities" element={<AdminOpportunitiesPage />} />
                <Route path="experiments" element={<AdminExperimentsPage />} />
                <Route path="missions" element={<AdminMissionsPage />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Route>

            {/* Without this, an unmatched URL renders an empty document. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ChatWidget />
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
