import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { signOut } from '@/lib/supabaseClient';
import VerificationMessage from './VerificationMessage';

interface VerificationRedirectProps {
  email: string;
}

export default function VerificationRedirect({ email }: VerificationRedirectProps) {
  const [, setLocation] = useLocation();
  const [isResending, setIsResending] = useState(false);

  // Handle resending verification email
  const handleResend = async () => {
    try {
      setIsResending(true);
      
      // Call the server's verification endpoint
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend verification');
      }
      
      alert('Verification email has been resent. Please check your inbox.');
      
    } catch (error) {
      console.error('Error resending verification:', error);
      alert('There was a problem resending the verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Sign out and redirect to verification page
  useEffect(() => {
    const redirect = async () => {
      try {
        await signOut();
        setLocation('/login?verification=required');
      } catch (error) {
        console.error('Error during verification redirect:', error);
      }
    };
    
    redirect();
  }, [setLocation]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-[#0d021f] border-[#333333]">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            <p className="text-center text-muted-foreground">
              Email verification required. Redirecting to login...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}