import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabaseClient';
import { 
  CheckCircle2, 
  KeyRound, 
  RefreshCw, 
  Mail, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

// Schema for the login form
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const verified = params.get('verified') === 'true';
  const error = params.get('error');
  const verification = params.get('verification');
  const emailParam = params.get('email');

  useEffect(() => {
    // Show verification success message if coming from email verification
    if (verified && emailParam) {
      toast({
        title: '✅ Email Verified Successfully!',
        description: 'Your email has been verified. Please sign in to continue.',
        duration: 5000,
      });
    }
    
    // Clean up URL parameters without showing notifications
    if (verified || error || verification || emailParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('verified');
      url.searchParams.delete('error');
      url.searchParams.delete('verification');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  }, [verified, error, verification, emailParam, toast]);

  // Get login form handlers
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailParam || localStorage.getItem('verified_email') || '',
      password: ''
    }
  });

  // Set email from URL parameter or localStorage on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('verified_email');
    if (emailParam) {
      setValue('email', emailParam);
      localStorage.removeItem('verified_email'); // Clean up
    } else if (storedEmail) {
      setValue('email', storedEmail);
      localStorage.removeItem('verified_email'); // Clean up
    }
  }, [emailParam, setValue]);

  // Success animation sequence - simplified without popup
  const showSuccessAnimation = async () => {
    // Navigate immediately without popup animations
    const redirectPath = localStorage.getItem('redirect_after_login') || '/';
    localStorage.removeItem('redirect_after_login');
    setLocation(redirectPath);
  };

  // Login form handler
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      // Attempt to sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      // Handle authentication errors
      if (authError) {
        let errorMessage = 'Invalid email or password';
        
        if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in. Check your inbox for a verification link.';
          
          toast({
            title: '📧 Email Verification Required',
            description: errorMessage,
            variant: 'destructive',
          });
          
          setIsLoading(false);
          return;
        }
        
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        }
        
        toast({
          title: 'Sign in failed',
          description: errorMessage,
          variant: 'destructive',
        });
        
        setIsLoading(false);
        return;
      }
      
      // Check if user exists and is verified
      if (authData.user) {
        // Check if email is verified
        if (!authData.user.email_confirmed_at) {
          // Important: Sign out the user immediately to prevent unauthorized access
          await supabase.auth.signOut();
          
          toast({
            title: '📧 Email Verification Required',
            description: 'Please verify your email address before logging in. Check your inbox for a verification link.',
            variant: 'destructive',
          });
          
          setIsLoading(false);
          return;
        }
        
        // Additional verification: Check if user is verified in our database
        try {
          const response = await fetch('/api/auth/user', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authData.session?.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            // User failed our database verification check
            await supabase.auth.signOut();
            
            // Email verification required - no popup
            
            setIsLoading(false);
            return;
          }
        } catch (error) {
          // If verification check fails, sign out and show error
          await supabase.auth.signOut();
          
          // Verification failed - no popup
          
          setIsLoading(false);
          return;
        }
        
        // Success! Redirect immediately without popup
        setIsLoading(false);
        
        // Start success animation sequence (now just redirects)
        await showSuccessAnimation();
      } else {
        throw new Error('No user data received');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      // No popup notification for errors
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Log In - VeloPlay</title>
        <meta name="description" content="Log in to your VeloPlay account to access premium sports content, including NFL, NBA, NHL, and MLB games." />
      </Helmet>
      
      <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-6 py-12 bg-[#0d021f]">
        <div className="flex flex-col sm:mx-auto sm:w-full sm:max-w-md space-y-6">
          {/* Header */}
          <motion.div 
            className="text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-white">
              Welcome Back
            </h1>
            <p className="text-[#a68dff] mt-2">
              Log in to access your VeloPlay account
            </p>
          </motion.div>
          
          {/* Login Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-[#1a1a1a] border-[#333333] overflow-hidden">
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="mb-4"
                    >
                      <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                    </motion.div>
                    
                    <motion.h3
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-xl font-semibold text-white mb-2"
                    >
                      Login Successful!
                    </motion.h3>
                    
                    <motion.p
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-[#a68dff] mb-4"
                    >
                      {isRedirecting ? 'Redirecting you to VeloPlay...' : 'Welcome back to VeloPlay!'}
                    </motion.p>
                    
                    {isRedirecting && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex justify-center"
                      >
                        <div className="w-6 h-6 border-2 border-[#7f00ff] border-t-transparent rounded-full animate-spin" />
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl text-white flex items-center">
                        <KeyRound className="mr-2 h-5 w-5 text-[#7f00ff]" />
                        Sign In
                      </CardTitle>
                      <CardDescription className="text-[#a68dff]">
                        Enter your credentials to access your account
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-white">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-[#a68dff]" />
                            <Input
                              id="email"
                              placeholder="Enter your email address"
                              type="email"
                              autoCapitalize="none"
                              autoComplete="email"
                              autoCorrect="off"
                              {...register('email')}
                              className="pl-10 bg-[#1c1c1c] border-[#444444] text-white placeholder:text-[#666666] focus:border-[#7f00ff] focus:ring-[#7f00ff]"
                            />
                          </div>
                          {errors.email && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400 flex items-center"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {errors.email.message}
                            </motion.p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-white">Password</Label>
                            <Link href="/forgot-password" className="text-sm text-[#7f00ff] hover:text-[#a855f7] transition-colors">
                              Forgot password?
                            </Link>
                          </div>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#a68dff]" />
                            <Input
                              id="password"
                              placeholder="Enter your password"
                              type="password"
                              autoComplete="current-password"
                              {...register('password')}
                              className="pl-10 bg-[#1c1c1c] border-[#444444] text-white placeholder:text-[#666666] focus:border-[#7f00ff] focus:ring-[#7f00ff]"
                            />
                          </div>
                          {errors.password && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400 flex items-center"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {errors.password.message}
                            </motion.p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-[#7f00ff] to-[#a855f7] hover:from-[#6b00d6] hover:to-[#9333ea] text-white border-0 transition-all duration-300 transform hover:scale-[1.02]" 
                          disabled={isLoading}
                          size="lg"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Sign In
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col space-y-4">
                      <div className="text-center text-sm text-[#a68dff]">
                        Don't have an account?{' '}
                        <Link href="/signup" className="text-[#7f00ff] hover:text-[#a855f7] font-medium transition-colors">
                          Sign up here
                        </Link>
                      </div>
                      
                      <div className="text-center text-xs text-[#666666]">
                        By signing in, you agree to our{' '}
                        <Link href="/legal/terms-of-service" className="text-[#7f00ff] hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/legal/privacy-policy" className="text-[#7f00ff] hover:underline">
                          Privacy Policy
                        </Link>
                      </div>
                    </CardFooter>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}