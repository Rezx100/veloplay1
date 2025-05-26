import React from 'react';
import LegalPageLayout from '@/components/layout/LegalPageLayout';

const RefundPolicy: React.FC = () => {
  return (
    <LegalPageLayout 
      title="Refund Policy" 
      description="VeloPlay Refund Policy - understand our subscription refund terms and eligibility conditions."
    >
      <p className="text-lg mb-4">Last Updated: May 14, 2025</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">1. Introduction</h2>
        <p className="mb-4">At VeloPlay, we aim to provide high-quality streaming services to all our subscribers. We understand that there may be instances where you may need to request a refund. This Refund Policy outlines the conditions under which refunds may be granted for our subscription services.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">2. Subscription Refund Eligibility</h2>
        <p className="mb-4">Refunds for subscription payments may be eligible under the following circumstances:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Technical Issues:</strong> Persistent technical issues that significantly impair your ability to use the service and cannot be resolved by our customer support team within a reasonable time frame.</li>
          <li><strong>Service Unavailability:</strong> Extended periods of service unavailability due to issues on our end (not including scheduled maintenance).</li>
          <li><strong>Accidental Purchases:</strong> Duplicate subscriptions or accidental purchases reported within 48 hours of the transaction.</li>
          <li><strong>Incorrect Charges:</strong> If you are charged incorrectly for a subscription or encounter billing errors not caused by your actions.</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">3. Non-Refundable Circumstances</h2>
        <p className="mb-4">Refunds will generally not be provided in the following circumstances:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Change of mind or no longer wishing to use the service.</li>
          <li>Issues relating to your device, internet connection, or other factors outside our control.</li>
          <li>Cancellation requests made after using a substantial portion of the subscription period.</li>
          <li>Failure to cancel a subscription before it auto-renews, unless auto-renewal was not clearly disclosed.</li>
          <li>Violations of our Terms of Service that result in account termination.</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">4. Refund Process</h2>
        <p className="mb-4">To request a refund, please contact our customer support team at <a href="mailto:support@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">support@veloplay.com</a> with the following information:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Your account email address</li>
          <li>Date of purchase</li>
          <li>Transaction ID (if available)</li>
          <li>Reason for the refund request</li>
          <li>Any relevant details or documentation supporting your request</li>
        </ul>
        <p className="mb-4">Our team will review your refund request and respond within 3-5 business days. If your refund is approved, the amount will be credited back to your original payment method, typically within 5-10 business days, depending on your payment provider's policies.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">5. Partial Refunds</h2>
        <p className="mb-4">In some cases, we may issue partial refunds based on the amount of time you have used the service during the billing period. Pro-rated refunds are calculated based on the number of days remaining in your subscription period.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">6. Subscription Cancellation</h2>
        <p className="mb-4">If you cancel your subscription, our service will remain available until the end of your current billing period. No refunds will be provided for the unused portion of your current billing period unless specified in Section 2.</p>
        <p className="mb-4">It is your responsibility to cancel your subscription before the renewal date if you do not wish to continue with the paid subscription for another billing cycle.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">7. Changes to Refund Policy</h2>
        <p className="mb-4">We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting on our website. It is your responsibility to review this policy periodically for changes.</p>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">8. Contact Us</h2>
        <p className="mb-4">If you have any questions about our Refund Policy, please contact us at: <a href="mailto:support@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">support@veloplay.com</a></p>
      </section>
    </LegalPageLayout>
  );
};

export default RefundPolicy;