import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import CrispChat from '@/components/chat/CrispChat';
import TrialOfferPopup from '@/components/promotions/TrialOfferPopup';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const [location, navigate] = useLocation();

  // Effect to close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle auth redirects for protected routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const protectedRoutes = ['/dashboard', '/admin'];
      
      if (protectedRoutes.some(route => location.startsWith(route))) {
        window.location.href = '/api/login';
      }
    }
  }, [isLoading, isAuthenticated, location]);

  // Check if we should hide the sidebar (for verification pages)
  const shouldHideSidebar = () => {
    // Hide sidebar on verification-related pages
    const hideOnRoutes = ['/auth-callback'];
    return hideOnRoutes.some(route => location.startsWith(route)) ||
           location.includes('verification') ||
           location.includes('verify');
  };

  const hideSidebar = shouldHideSidebar();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0d021f]">
      {/* Mobile Nav Bar - hidden on verification pages */}
      {!hideSidebar && (
        <div className="md:hidden bg-[#130426] p-4 flex justify-between items-center border-b border-[#2f1a48]">
          <div className="text-3xl font-bold text-[#f2f2f2] flex items-center">
            <div className="flex items-center">
              {/* All text in one line for better proportions */}
              <span className="font-extrabold flex items-center">
                {/* V with outline effect - no extra spacing */}
                <span className="relative" style={{ marginTop: '-1px' }}>
                  <span className="absolute -left-[0.5px] -top-[0.5px] text-white">V</span>
                  <span className="absolute -left-[1px] -top-[1px] text-white">V</span>
                  <span className="absolute -left-[1.5px] -top-[1.5px] text-white">V</span>
                  <span className="relative z-10 text-[#9333ea]">V</span>
                </span>
                {/* elo - gradient text */}
                <span className="bg-gradient-to-r from-[#9333ea] to-[#06b6d4] bg-clip-text text-transparent">elo</span>
                {/* Play - white text */}
                <span className="text-[#f2f2f2]">Play</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-[#f2f2f2] p-2"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      )}

      {/* Mobile Sidebar - hidden on verification pages */}
      {!hideSidebar && (
        <MobileSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          user={user}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
        />
      )}

      {/* Desktop Sidebar - hidden on verification pages */}
      {!hideSidebar && (
        <Sidebar 
          user={user}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#0d021f] text-[#f2f2f2]">
        <main className="flex-1">
          {children}
        </main>
        {!hideSidebar && <Footer />}
        {/* Crisp Chat for customer support - hidden on verification pages */}
        {!hideSidebar && <CrispChat />}
        {/* Promotional popup for new visitors - hidden on verification pages */}
        {!hideSidebar && <TrialOfferPopup />}
      </div>
    </div>
  );
}
