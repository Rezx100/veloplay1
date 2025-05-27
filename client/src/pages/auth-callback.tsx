import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { handleEmailVerification } from '../lib/supabase';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processEmailVerification = async () => {
      try {
        // Get parameters from the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const autoVerify = params.get('autoVerify');
        const email = params.get('email');
        
        // Check if we have a returnTo parameter - this would be the original URL the user was trying to access
        const returnTo = params.get('returnTo');
        
        // Get saved game URL from localStorage if it exists
        const savedGameUrl = localStorage.getItem('gameUrlBeforeVerification');
        
        // Always redirect to login page after verification
        let redirectUrl = '/login?verified=true';
        
        // Clear any saved game URLs
        localStorage.removeItem('gameUrlBeforeVerification');
        
        // Check if this is our custom direct verification link
        if (autoVerify === 'true' && email) {
          console.log('Using auto-verification method for email:', email);
          
          // Set email_verified in localStorage immediately
          localStorage.setItem('email_verified', 'true');
          
          // Mark the email as verified in our system and get auth token
          try {
            // Call the API to mark the email as verified in our system
            const response = await fetch('/api/verify-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, autoLogin: true })
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('Email verified successfully in our system', data);
              
              // For auto-login, we'll redirect to login with pre-filled email and success message
              if (data.autoLogin && data.userId) {
                console.log('Redirecting to login with verification success for:', email);
                
                // Store the email for pre-filling the login form
                localStorage.setItem('verified_email', email);
                localStorage.setItem('email_verified', 'true');
                
                // Redirect to login with success parameters
                redirectUrl = `/login?verified=true&email=${encodeURIComponent(email)}`;
              } else {
                // Check if we should redirect to pricing page
                if (data.redirectToPricing) {
                  // Set a flag to redirect to pricing after login
                  localStorage.setItem('redirect_to_pricing', 'true');
                  console.log('User will be redirected to pricing page after login');
                }
              }
            } else {
              console.error('Failed to verify email in our system');
            }
          } catch (error) {
            console.error('Error verifying email in our system', error);
          }
          
          // Show success state and redirect after animation
          setStatus('success');
          setTimeout(() => {
            setLocation(redirectUrl);
          }, 3500); // Longer delay to allow animation to play
          
          return;
        }
        
        // Standard Supabase verification flow using code
        if (!code) {
          setStatus('error');
          setErrorMessage('Verification code is missing. Please try again.');
          return;
        }
        
        // Handle the verification code
        const result = await handleEmailVerification(code);
        
        if (result.success) {
          // Set email_verified in localStorage
          localStorage.setItem('email_verified', 'true');
          setStatus('success');
          
          // Redirect after a delay to show celebratory animation
          setTimeout(() => {
            setLocation(redirectUrl);
          }, 3500); // Longer delay to allow animation to play
        } else {
          setStatus('error');
          setErrorMessage('Failed to verify email. The link may have expired.');
        }
      } catch (error) {
        console.error('Error during verification:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during verification.');
      }
    };
    
    processEmailVerification();
  }, [setLocation]);

  return (
    <>
      <Helmet>
        <title>Verifying Email - VeloPlay</title>
        <meta name="description" content="Verifying your email for VeloPlay account" />
      </Helmet>
      
      <div className="container flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md p-8 bg-[#1a1a1a] border border-[#333333] rounded-lg text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
              <h1 className="text-2xl font-bold mb-2">Verifying Your Email</h1>
              <p className="text-gray-400">Please wait while we verify your email address...</p>
            </>
          )}
          
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              {/* Confetti elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-2 h-2 rounded-full z-10`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-20px`,
                      backgroundColor: i % 3 === 0 ? '#7f00ff' : i % 3 === 1 ? '#3cc6fc' : '#fc3cc9',
                    }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ 
                      y: ['0%', '100%'], 
                      opacity: [0, 1, 0],
                      x: [0, (Math.random() * 40) - 20]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      ease: "easeOut",
                      delay: Math.random() * 0.5,
                    }}
                  />
                ))}
              </div>
              
              {/* Check mark with success animation */}
              <motion.div 
                className="w-20 h-20 mx-auto mb-6 bg-purple-500/20 rounded-full flex items-center justify-center"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-10 w-10 text-purple-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <motion.path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </motion.svg>
              </motion.div>
              
              {/* Success text with animations */}
              <motion.h1 
                className="text-3xl font-bold mb-3 text-white"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Email Verified!
              </motion.h1>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <p className="text-purple-300 mb-2 font-medium">Your account is now verified</p>
                <p className="text-gray-400">Please choose a subscription plan to access premium features</p>
                <p className="text-gray-400 mt-4">Redirecting you to login...</p>
              </motion.div>
              
              {/* Pulse effect at the bottom */}
              <motion.div 
                className="w-full h-1 bg-purple-600 rounded-full mt-8 mx-auto"
                initial={{ width: "0%", opacity: 0 }}
                animate={{ width: "100%", opacity: [0, 1, 0.5, 1] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse" 
                }}
              />
            </motion.div>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
              <p className="text-gray-400">{errorMessage}</p>
              <div className="mt-6">
                <button 
                  onClick={() => setLocation('/signup')}
                  className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded text-white"
                >
                  Back to Sign Up
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}