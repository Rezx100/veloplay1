import { useState } from 'react';
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
import VerificationMessage from '@/components/auth/VerificationMessage';
import { supabaseClient } from '../lib/supabase';
import { 
  CheckCircle2, 
  UserPlus, 
  RefreshCw, 
  Mail, 
  AlertCircle,
  Sparkles,
  User,
  KeyRound
} from 'lucide-react';

// Schema for the signup form
const signupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    
    try {
      // First, create a verification request to the server to ensure email can be sent
      try {
        const verifyResponse = await fetch('/api/auth/pre-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName || ''
          }),
        });
        
        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.message || 'Failed to initiate signup process');
        }
      } catch (preSignupError) {
        console.error('Pre-signup verification error:', preSignupError);
        // Continue with normal flow even if this fails
      }
      
      // Use a special parameter to indicate this is a signup without auto-login
      const { data: authData, error } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
      });
      
      // CRITICAL: Immediately sign out to prevent auto-login
      await supabaseClient.auth.signOut();
      console.log("User immediately signed out after signup to prevent auto-login");
      
      // Log verification attempt for debugging
      console.log("Signup verification email triggered for:", data.email);
      
      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      
      // Check if email confirmation is needed
      // If identities array is empty, user already exists but needs to confirm email
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        toast({
          title: 'Email already registered',
          description: 'Please check your inbox for the verification email from noreply@veloplay.tv. Also check your spam folder.',
        });
        setVerificationEmail(data.email);
        return;
      }
      
      // Supabase automatically sends verification email during signup
      // No additional email calls needed - let Supabase handle it
      console.log("Supabase will automatically send verification email");
      
      // If we get here, user was created and needs to confirm email
      // We've already signed out above, but this is a good place to clear any session data
      try {
        // Clear any local storage session data to ensure user is completely signed out
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
        console.log("User completely signed out after signup - ensuring manual login required after verification");
      } catch (clearError) {
        console.error("Error clearing session data after signup:", clearError);
      }
      
      // Show success animation first
      setShowSuccess(true);
      
      // After a brief moment, show the verification screen
      setTimeout(() => {
        setVerificationEmail(data.email);
      }, 2000);
      
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: 'Sign up failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendEmail = async () => {
    if (!verificationEmail) return;
    
    setIsResendingEmail(true);
    
    try {
      const { data, error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Email sent',
        description: 'Verification email has been resent. Please check your inbox.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to resend email',
        description: error?.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsResendingEmail(false);
    }
  };
  
  // If user is in verification state, show verification message
  if (verificationEmail) {
    return (
      <>
        <Helmet>
          <title>Verify Your Email - VeloPlay</title>
          <meta name="description" content="Verify your email address to complete your signup for VeloPlay." />
        </Helmet>
        
        <div className="container flex items-center justify-center min-h-[80vh] py-8">
          <VerificationMessage 
            email={verificationEmail} 
            onResend={handleResendEmail}
            isResending={isResendingEmail}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sign Up - VeloPlay</title>
        <meta name="description" content="Create your VeloPlay account and start streaming your favorite sports content including NFL, NBA, NHL, and MLB games." />
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
              Join VeloPlay
            </h1>
            <p className="text-[#a68dff] mt-2">
              Create your account and start streaming
            </p>
          </motion.div>
          
          {/* Signup Card */}
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
                      Account Created!
                    </motion.h3>
                    
                    <motion.p
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-[#a68dff] mb-4"
                    >
                      Please check your email to verify your account
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl text-white flex items-center">
                        <UserPlus className="mr-2 h-5 w-5 text-[#7f00ff]" />
                        Create Account
                      </CardTitle>
                      <CardDescription className="text-[#a68dff]">
                        Enter your details to join VeloPlay
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-white">First name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-[#a68dff]" />
                              <Input
                                id="firstName"
                                placeholder="John"
                                autoComplete="given-name"
                                {...register('firstName')}
                                className="pl-10 bg-[#1c1c1c] border-[#444444] text-white placeholder:text-[#666666] focus:border-[#7f00ff] focus:ring-[#7f00ff]"
                              />
                            </div>
                            {errors.firstName && (
                              <motion.p 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-red-400 flex items-center"
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.firstName.message}
                              </motion.p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-white">Last name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-[#a68dff]" />
                              <Input
                                id="lastName"
                                placeholder="Doe (optional)"
                                autoComplete="family-name"
                                {...register('lastName')}
                                className="pl-10 bg-[#1c1c1c] border-[#444444] text-white placeholder:text-[#666666] focus:border-[#7f00ff] focus:ring-[#7f00ff]"
                              />
                            </div>
                            {errors.lastName && (
                              <motion.p 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-red-400 flex items-center"
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.lastName.message}
                              </motion.p>
                            )}
                          </div>
                        </div>
                        
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
                          <Label htmlFor="password" className="text-white">Password</Label>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#a68dff]" />
                            <Input
                              id="password"
                              placeholder="Create a secure password"
                              type="password"
                              autoComplete="new-password"
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
                              Creating account...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Create Account
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col space-y-4">
                      <div className="text-center text-sm text-[#a68dff]">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#7f00ff] hover:text-[#a855f7] font-medium transition-colors">
                          Sign in here
                        </Link>
                      </div>
                      
                      <div className="text-center text-xs text-[#666666]">
                        By creating an account, you agree to our{' '}
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