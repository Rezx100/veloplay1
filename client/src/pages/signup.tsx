import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
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
      
      // Send verification email using Supabase's resend API first
      // This ensures we use their official method for verification emails
      console.log("Sending verification email through Supabase resend API...");
      try {
        const { data: resendData, error: resendError } = await supabaseClient.auth.resend({
          type: 'signup',
          email: data.email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (resendError) {
          console.error("Supabase resend error:", resendError);
          // Will continue to our custom method
        } else {
          console.log("Successfully requested verification email from Supabase");
        }
      } catch (resendError) {
        console.error("Error with Supabase resend:", resendError);
        // Will continue to our custom method
      }
      
      // GUARANTEE verification email delivery by ALSO sending it directly through our system
      // This is a belt-and-suspenders approach to ensure email delivery
      console.log("ALSO sending verification through our direct method as backup...");
      
      try {
        // Use our reliable direct method to send the verification email
        const verificationResponse = await fetch('/api/auth/send-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: data.email,
            firstName: data.firstName, 
            useDirectMethod: true  // Special flag to use our reliable direct method
          }),
        });
        
        if (!verificationResponse.ok) {
          console.error("Verification request failed with status:", verificationResponse.status);
          throw new Error(`Failed to send verification email: ${verificationResponse.statusText}`);
        }
        
        const responseData = await verificationResponse.json();
        console.log("Custom verification API response:", responseData);
        
        if (!responseData.success) {
          console.warn("Direct verification method returned unsuccessful status:", responseData.message);
        } else {
          console.log("Successfully sent verification email through our direct method");
        }
      } catch (verificationError) {
        console.error("Failed to send direct verification email:", verificationError);
        // Continue with the flow even if direct method fails
      }
      
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
      
      toast({
        title: 'Account created',
        description: 'Please check your inbox for the verification email. You should receive one or more emails with verification links. Check your spam folder if nothing appears within a few minutes.',
      });
      setVerificationEmail(data.email);
      
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
        <meta name="description" content="Create your VeloPlay account and start streaming your favorite sports." />
      </Helmet>
      
      <div className="container flex items-center justify-center min-h-[80vh] py-8">
        <Card className="w-full max-w-md bg-[#1a1a1a] border-[#333333]">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
            <CardDescription>
              Enter your details to create your VeloPlay account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name (optional)</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-purple-700 hover:bg-purple-800"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>
              
              <div className="text-center text-sm">
                Already have an account?{' '}
                <Link href="/login">
                  <a className="text-purple-400 hover:underline">Sign in</a>
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}