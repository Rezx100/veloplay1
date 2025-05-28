import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { supabase } from "@/lib/supabaseClient";


import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import League from "@/pages/league";
import Game from "@/pages/game";
import Admin from "@/pages/admin-new"; // Updated to use the new admin panel design
import Pricing from "@/pages/pricing";
import Dashboard from "@/pages/dashboard";
import AuthCallback from "./pages/auth-callback";

import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccess from "./pages/payment-success";
import Channels from "@/pages/channels";
import Channel from "@/pages/channel";
// TestStream page removed - was only used for development testing

// Legal pages
import TermsOfService from "@/pages/legal/terms-of-service";
import PrivacyPolicy from "@/pages/legal/privacy-policy";
import CookiePolicy from "@/pages/legal/cookie-policy";
import Dmca from "@/pages/legal/dmca";
import RefundPolicy from "@/pages/legal/refund-policy";

// Company pages
import AboutUs from "@/pages/company/about-us";
import Careers from "@/pages/company/careers";
import Press from "@/pages/company/press";
import Contact from "@/pages/company/contact";

import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import { useAuth } from "./hooks/useAuth";
import ScrollToTop from "@/components/layout/ScrollToTop";

// Purple themed loading indicator for consistent UI 
function PurpleLoadingSpinner() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#0d021f] text-white">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#7f00ff] border-t-transparent animate-spin mb-3"></div>
        <p className="text-[#a68dff]">Loading...</p>
      </div>
    </div>
  );
}

// Private route component that redirects to login if not authenticated
function PrivateRoute({ component: Component, requireTrial = true, ...rest }: any) {
  const { isAuthenticated, isEmailVerified, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get user profile data to check trial status - but only if authenticated
  const { data: userProfile, isLoading: isProfileLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
    retry: false
  });
  
  // Get the router match to extract route parameters
  const [match] = useRoute(rest.path);
  
  // Show loading spinner while checking auth or profile
  if (isLoading || (requireTrial && isProfileLoading)) {
    console.log('PrivateRoute: Loading auth or profile data...');
    return <PurpleLoadingSpinner />;
  }
  
  // SECURITY FIX: If not authenticated, redirect to login immediately
  if (!isAuthenticated) {
    console.log('PrivateRoute: User not authenticated, redirecting to login');
    setLocation("/login");
    return null;
  }
  
  // SECURITY FIX: Strict verification check - BOTH frontend AND database must confirm verification
  const isUserVerified = isEmailVerified && userProfile?.isVerified === true;
  
  // SECURITY FIX: Block ALL unverified users from accessing any protected content
  if (!isUserVerified) {
    console.log('PrivateRoute: Email not verified - blocking access and redirecting to verification');
    setLocation("/login?verification=required");
    return null;
  }
  
  // Check if user has an active 15-day trial
  if (requireTrial && userProfile && !isAdmin) {
    // Use the correct field name from the database schema
    const createdAt = new Date(userProfile.createdAt || userProfile.created_at);
    const trialExpiresAt = new Date(createdAt);
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 15);
    
    const now = new Date();
    const isTrialActive = now < trialExpiresAt;
    
    console.log('PrivateRoute: Trial check:', {
      userProfile,
      createdAt: createdAt.toISOString(),
      trialExpiresAt: trialExpiresAt.toISOString(),
      now: now.toISOString(),
      isTrialActive,
      isAdmin
    });
    
    if (!isTrialActive) {
      console.log('PrivateRoute: Trial expired, redirecting to pricing page');
      // Before redirecting, store the current URL in localStorage so we can return after subscription
      const currentUrl = window.location.pathname;
      localStorage.setItem('contentUrlBeforeSubscription', currentUrl);
      
      setLocation("/pricing?trial=expired");
      return null;
    }
    
    console.log('PrivateRoute: User has active trial, granting access');
  }
  
  // If the user is an admin, log that they're bypassing trial check
  if (requireTrial && isAdmin) {
    console.log('PrivateRoute: Admin user accessing premium content without trial check');
  }
  
  // If authenticated, verified, and (has active trial or doesn't need one), render the component
  // Pass route params from the matched route
  return <Component {...rest} params={match ? match.params : {}} />;
}

// Admin route component that redirects to home if not an admin
function AdminRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // If still loading, show our purple loading indicator
  if (isLoading) {
    return <PurpleLoadingSpinner />;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }
  
  // If not admin, redirect to home
  if (!isAdmin) {
    setLocation("/");
    return null;
  }
  
  // If admin, render the component
  return <Component {...rest} />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/league/:leagueId" component={League} />
        
        {/* Premium content route - protected by subscription check */}
        <Route path="/game/:gameId">
          <PrivateRoute path="/game/:gameId" component={Game} requireSubscription={true} />
        </Route>
        
        {/* Live TV Channel Routes - publicly accessible */}
        <Route path="/channels" component={Channels} />
        <Route path="/channel/:id" component={Channel} />
        
        <Route path="/pricing" component={Pricing} />
        {/* Test stream route removed - was only used for development testing */}
        
        {/* Auth routes */}
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route path="/auth-callback" component={AuthCallback} />
        
        {/* Legal pages */}
        <Route path="/legal/terms-of-service" component={TermsOfService} />
        <Route path="/legal/privacy-policy" component={PrivacyPolicy} />
        <Route path="/legal/cookie-policy" component={CookiePolicy} />
        <Route path="/legal/dmca" component={Dmca} />
        <Route path="/legal/refund-policy" component={RefundPolicy} />
        
        {/* Company pages */}
        <Route path="/company/about-us" component={AboutUs} />
        <Route path="/company/careers" component={Careers} />
        <Route path="/company/press" component={Press} />
        <Route path="/company/contact" component={Contact} />
        
        {/* Private routes (require authentication) */}
        <Route path="/dashboard">
          <PrivateRoute component={Dashboard} requireSubscription={false} />
        </Route>
        
        {/* Admin routes (require admin privileges) */}
        <Route path="/admin">
          <AdminRoute component={Admin} />
        </Route>
        
        {/* Payment routes */}
        <Route path="/checkout">
          <PrivateRoute component={CheckoutPage} requireSubscription={false} />
        </Route>
        <Route path="/payment-success" component={PaymentSuccess} />


        
        {/* 404 route */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// Handle API route redirection
function ApiRouteRedirector() {
  const [location, setLocation] = useLocation();
  const isLoginRoute = useRoute('/api/login');
  const isLogoutRoute = useRoute('/api/logout');
  const isSignupRoute = useRoute('/api/signup');

  useEffect(() => {
    // Extract query parameters for redirects
    const searchParams = new URLSearchParams(window.location.search);
    const newUser = searchParams.get('new');
    
    // If we're at /api/login, redirect to the client-side /login or /signup route
    if (isLoginRoute[0]) {
      // If 'new=true' query parameter is present, redirect to signup instead of login
      if (newUser === 'true') {
        setLocation('/signup');
      } else {
        setLocation('/login');
      }
    } 
    // If we're at /api/signup, redirect to the client-side /signup route
    else if (isSignupRoute[0]) {
      setLocation('/signup');
    }
    // If we're at /api/logout, sign out and redirect to home
    else if (isLogoutRoute[0]) {
      // Could add sign out logic here if needed
      setLocation('/');
    }
    // Check if the URL starts with /api but isn't a valid API endpoint
    else if (location.startsWith('/api/') && !location.match(/^\/(api\/auth|api\/games|api\/game|api\/stream|api\/subscription)/)) {
      setLocation('/not-found');
    }
  }, [location, isLoginRoute, isLogoutRoute, isSignupRoute, setLocation]);

  return null;
}

function App() {
  // Handle email verification auto-login
  useEffect(() => {
    const handleEmailVerification = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          console.log('Email verification code detected, attempting auto-login...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Email verification auto-login failed:', error);
          } else {
            console.log('Email verification successful, user auto-logged in');
            // Clear the code from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Error during email verification:', error);
        }
      }
    };

    handleEmailVerification();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark bg-background min-h-screen">
          <Toaster />
          <ApiRouteRedirector />
          <ScrollToTop /> {/* Add ScrollToTop to automatically scroll to top on route changes */}
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
