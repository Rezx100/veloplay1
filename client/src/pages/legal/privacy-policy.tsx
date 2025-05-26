import React from 'react';
import LegalPageLayout from '@/components/layout/LegalPageLayout';

const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout 
      title="Privacy Policy" 
      description="VeloPlay Privacy Policy - Learn how we collect, use, and protect your personal information."
    >
      <p className="text-lg mb-4">Last Updated: May 14, 2025</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">1. Introduction</h2>
        <p className="mb-4">VeloPlay ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and services (collectively, the "Service").</p>
        <p className="mb-4">Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">2. Information We Collect</h2>
        <p className="mb-4">We collect several types of information from and about users of our Service:</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">2.1 Personal Information</h3>
        <p className="mb-4">We may collect personally identifiable information such as:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Name, email address, and contact information when you create an account</li>
          <li>Billing information and payment details (processed securely through our payment processors)</li>
          <li>User preferences, such as favorite teams, sports, or viewing history</li>
          <li>Information you provide when contacting our customer support</li>
        </ul>
        
        <h3 className="text-lg font-semibold mb-2 text-white">2.2 Usage Data</h3>
        <p className="mb-4">We automatically collect certain information when you access and use the Service, including:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>IP address, device type, browser type, and operating system</li>
          <li>Pages visited, time spent on pages, and links clicked</li>
          <li>Streaming quality, buffering events, and other technical metrics</li>
          <li>Geographic location (general region, not precise location unless you grant permission)</li>
        </ul>
        
        <h3 className="text-lg font-semibold mb-2 text-white">2.3 Cookies and Similar Technologies</h3>
        <p className="mb-4">We use cookies, web beacons, pixels, and similar technologies to enhance your experience on our Service. These technologies help us:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Remember your login status and preferences</li>
          <li>Understand how you use our Service</li>
          <li>Personalize content and recommendations</li>
          <li>Analyze the effectiveness of our features</li>
        </ul>
        <p className="mb-4">You can control cookies through your browser settings. However, disabling cookies may limit your ability to use some features of the Service. For more information about our cookie practices, please see our <a href="/legal/cookie-policy" className="text-[#a68dff] hover:text-[#7f00ff]">Cookie Policy</a>.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">3. How We Use Your Information</h2>
        <p className="mb-4">We use the information we collect for various purposes, including to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Provide, maintain, and improve the Service</li>
          <li>Process transactions and manage your subscription</li>
          <li>Personalize your experience and deliver content relevant to your interests</li>
          <li>Send you technical notices, updates, security alerts, and support messages</li>
          <li>Respond to your comments, questions, and requests</li>
          <li>Monitor and analyze trends, usage, and activities in connection with the Service</li>
          <li>Detect, prevent, and address technical issues, fraud, or illegal activities</li>
          <li>Develop new products, services, features, and functionality</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">4. How We Share Your Information</h2>
        <p className="mb-4">We may share your information in the following circumstances:</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.1 Service Providers</h3>
        <p className="mb-4">We may share your information with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.2 Business Transfers</h3>
        <p className="mb-4">If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.3 Legal Requirements</h3>
        <p className="mb-4">We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.4 Protection of Rights</h3>
        <p className="mb-4">We may disclose your information to protect the safety, rights, property, or security of VeloPlay, the Service, any third party, or the general public; to detect, prevent, or otherwise address fraud, security, or technical issues; to prevent or stop activity that we consider to be illegal or unethical.</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.5 With Your Consent</h3>
        <p className="mb-4">We may share your information with your consent or at your direction.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">5. Data Security</h2>
        <p className="mb-4">We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure.</p>
        <p className="mb-4">While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security. You are responsible for maintaining the confidentiality of your account credentials and limiting access to your devices.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">6. Your Rights and Choices</h2>
        <p className="mb-4">Depending on your location, you may have certain rights regarding your personal information, including:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>The right to access and receive a copy of your personal information</li>
          <li>The right to correct or update your personal information</li>
          <li>The right to request deletion of your personal information</li>
          <li>The right to restrict or object to our processing of your personal information</li>
          <li>The right to data portability</li>
          <li>The right to withdraw consent at any time, where our processing is based on your consent</li>
        </ul>
        <p className="mb-4">To exercise these rights, please contact us using the information provided in the "Contact Us" section below. Please note that these rights may be limited in some circumstances by applicable law.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">7. Children's Privacy</h2>
        <p className="mb-4">Our Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us. If we become aware that we have collected personal information from a child under 18 without verification of parental consent, we will take steps to remove that information from our servers.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">8. International Data Transfers</h2>
        <p className="mb-4">Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction.</p>
        <p className="mb-4">If you are located outside the United States and choose to provide information to us, please note that we transfer the data to the United States and process it there. Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">9. Third-Party Links and Services</h2>
        <p className="mb-4">Our Service may contain links to other websites or services that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p>
        <p className="mb-4">We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">10. Changes to This Privacy Policy</h2>
        <p className="mb-4">We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top.</p>
        <p className="mb-4">You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">11. Contact Us</h2>
        <p className="mb-4">If you have any questions about this Privacy Policy, please contact us at:</p>
        <p className="mb-4">
          Email: <a href="mailto:privacy@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">privacy@veloplay.com</a><br />
          Address: 123 Sports Avenue, San Francisco, CA 94105, United States
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;