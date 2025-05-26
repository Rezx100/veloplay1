import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface EmailSettingsProps {
  userEmail: string;
  userName: string;
}

export default function EmailSettings({ userEmail, userName }: EmailSettingsProps) {
  const { toast } = useToast();
  const [generalNotifications, setGeneralNotifications] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(false);
  const [gameAlerts, setGameAlerts] = useState(true);
  const [subscriptionReminders, setSubscriptionReminders] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Save email preferences
  const savePreferences = async () => {
    setIsSaving(true);
    
    try {
      // This would save to a database in a real implementation
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Preferences saved",
        description: "Your email notification preferences have been updated.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Send a welcome email as a test
  const sendTestWelcomeEmail = async () => {
    setIsSendingTest(true);
    
    try {
      // Direct fetch for testing (bypassing apiRequest helper)
      const response = await fetch('/api/email/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          displayName: userName
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.success) {
        toast({
          title: "Email sent",
          description: "A welcome email has been sent to your email address.",
          variant: "default",
        });
      } else {
        throw new Error((data && data.error) || "Failed to send welcome email");
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Email Error",
        description: `Failed to send the test email. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Manage what emails you receive from VeloPlay
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="general-notifications">General Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive important announcements and account information
            </p>
          </div>
          <Switch
            id="general-notifications"
            checked={generalNotifications}
            onCheckedChange={setGeneralNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="promotional-emails">Promotional Emails</Label>
            <p className="text-sm text-muted-foreground">
              Receive special offers and promotional announcements
            </p>
          </div>
          <Switch
            id="promotional-emails"
            checked={promotionalEmails}
            onCheckedChange={setPromotionalEmails}
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="game-alerts">Game Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications when your followed games are about to start
            </p>
          </div>
          <Switch
            id="game-alerts"
            checked={gameAlerts}
            onCheckedChange={setGameAlerts}
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="subscription-reminders">Subscription Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Receive reminders when your subscription is about to expire
            </p>
          </div>
          <Switch
            id="subscription-reminders"
            checked={subscriptionReminders}
            onCheckedChange={setSubscriptionReminders}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          <Button 
            className="bg-purple-700 hover:bg-purple-800"
            onClick={savePreferences} 
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={sendTestWelcomeEmail} 
            disabled={isSendingTest}
          >
            {isSendingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSendingTest ? "Sending..." : "Send Test Email"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}