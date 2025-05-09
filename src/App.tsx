import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth")); 
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const BrowseListings = lazy(() => import("./pages/BrowseListings"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const Sell = lazy(() => import("./pages/Sell"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const MyListings = lazy(() => import("./pages/MyListings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MyPendingItems = lazy(() => import("./pages/MyPendingItems"));
const MyOffers = lazy(() => import("./pages/MyOffers"));
const PendingReview = lazy(() => import("./pages/admin/PendingReview"));
const AdminOffersPage = lazy(() => import("./pages/admin/AdminOfferCoordination"));
const TransactionReports = lazy(() => import("./pages/admin/TransactionReports"));
const PrivateRoute = lazy(() => import("./components/auth/PrivateRoute"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
                <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
                <Route path="/listings" element={<BrowseListings />} />
                <Route path="/my-listings" element={<PrivateRoute><MyListings /></PrivateRoute>} />
                <Route path="/my-pending-items" element={<PrivateRoute><MyPendingItems /></PrivateRoute>} />
                <Route path="/my-offers" element={<PrivateRoute><MyOffers /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
                <Route path="/admin/pending-review" element={<PrivateRoute><PendingReview /></PrivateRoute>} />
                <Route path="/admin/offers" element={<PrivateRoute><AdminOffersPage /></PrivateRoute>} />
                <Route path="/admin/reports" element={<PrivateRoute><TransactionReports /></PrivateRoute>} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/category/:categoryId" element={<CategoryPage />} />
                <Route path="/user-profile/:userId" element={<UserProfile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
