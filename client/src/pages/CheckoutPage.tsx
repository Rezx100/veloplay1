import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Payment System Unavailable
            </h2>
            <p className="text-gray-600 mb-6">
              The payment system is currently being updated. Please check back later or contact support for assistance.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}