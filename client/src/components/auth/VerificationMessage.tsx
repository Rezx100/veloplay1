import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";

interface VerificationMessageProps {
  email: string;
  onResend: () => void;
  isResending: boolean;
}

export default function VerificationMessage({ email, onResend, isResending }: VerificationMessageProps) {
  const [isBackupSending, setIsBackupSending] = useState(false);
  
  // Function to try the backup verification method
  const handleBackupVerification = async () => {
    try {
      setIsBackupSending(true);
      
      // Show an info message to prevent multiple clicks
      const confirmed = window.confirm(
        "This will send a single verification email. Please check both your inbox AND spam folder for emails from noreply@veloplay.tv after clicking OK."
      );
      
      if (!confirmed) {
        setIsBackupSending(false);
        return;
      }
      
      // Get the current page URL to redirect back after verification
      const currentPath = window.location.pathname + window.location.search;
      
      // Save the current URL to localStorage so we can redirect back after verification
      // This is especially important for game pages
      if (currentPath.includes('/game/')) {
        localStorage.setItem('gameUrlBeforeVerification', currentPath);
        console.log('Saved game URL for post-verification redirect:', currentPath);
      }
      
      // Call the server's backup verification endpoint
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          returnUrl: currentPath
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send backup verification');
      }
      
      alert('Verification email sent. Please check both your inbox AND spam folder for an email from noreply@veloplay.tv');
      
    } catch (error) {
      console.error('Error sending backup verification:', error);
      alert('There was a problem sending the verification email. Please try again or contact support.');
    } finally {
      setIsBackupSending(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md bg-[#0d021f] border-[#333333] shadow-lg shadow-purple-500/10">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#7f00ff] to-[#9333ea] rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Mail className="h-10 w-10 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold mt-6 text-white">Check Your Email</CardTitle>
        <CardDescription className="text-gray-300 text-base">
          We've sent a verification link to{' '}
          <span className="font-semibold text-[#7f00ff]">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6">
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2a1a3e] p-5 rounded-xl border border-[#7f00ff]/20 shadow-sm">
          <h3 className="font-semibold text-white text-lg mb-3">What happens next?</h3>
          <ol className="space-y-3 text-gray-200 list-decimal pl-6">
            <li className="pl-1">Check your email inbox for a message from <strong className="text-[#7f00ff]">noreply@veloplay.tv</strong></li>
            <li className="pl-1">Click the verification link in the email</li>
            <li className="pl-1">Once verified, you'll be able to sign in to your account</li>
          </ol>
        </div>
        <p className="text-center text-gray-300 text-sm">
          Can't find the email? Check your spam folder or try one of the options below.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
        <Button 
          onClick={onResend} 
          variant="default" 
          className="w-full h-12 bg-gradient-to-r from-[#7f00ff] to-[#9333ea] hover:from-[#6600cc] hover:to-[#7c2d92] text-white font-medium transition-all"
          disabled={isResending}
        >
          {isResending ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Resending...
            </>
          ) : (
            <>
              Resend verification email
            </>
          )}
        </Button>
        
        <Button 
          onClick={handleBackupVerification}
          variant="secondary"
          className="w-full h-12 bg-[#7f00ff]/80 hover:bg-[#7f00ff] text-white font-medium transition-all"
          disabled={isBackupSending}
        >
          {isBackupSending ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Sending backup verification...
            </>
          ) : (
            <>
              Try backup verification method
            </>
          )}
        </Button>
        
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-[#333333]"></div>
          <span className="mx-4 flex-shrink text-sm text-gray-400 font-medium">or</span>
          <div className="flex-grow border-t border-[#333333]"></div>
        </div>
        
        <Button 
          variant="outline" 
          className="text-[#7f00ff] hover:text-white hover:bg-[#1a1a1a] border border-[#333333]"
          onClick={() => window.location.href = '/'}
        >
          Return to home page
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}