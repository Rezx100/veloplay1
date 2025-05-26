import React from 'react';
import LegalPageLayout from '@/components/layout/LegalPageLayout';

const CookiePolicy: React.FC = () => {
  return (
    <LegalPageLayout 
      title="Cookie Policy" 
      description="VeloPlay Cookie Policy - Information about how we use cookies and similar technologies on our platform."
    >
      <p className="text-lg mb-4">Last Updated: May 14, 2025</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">1. Introduction</h2>
        <p className="mb-4">This Cookie Policy explains how VeloPlay ("we," "our," or "us") uses cookies and similar technologies on our website, mobile applications, and online services (collectively, the "Service").</p>
        <p className="mb-4">By using our Service, you consent to the use of cookies and similar technologies in accordance with this Cookie Policy. If you do not agree with our use of cookies, you can adjust your browser settings to disable or block cookies, or you can choose not to use our Service.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">2. What Are Cookies?</h2>
        <p className="mb-4">Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners. Cookies can be "persistent" or "session" cookies:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Persistent cookies</strong> remain on your device after you close your browser until they expire or you delete them.</li>
          <li><strong>Session cookies</strong> are temporary and are deleted from your device once you close your browser.</li>
        </ul>
        <p className="mb-4">In addition to cookies, we may use other similar technologies, such as web beacons (also known as pixel tags), local storage, and mobile device identifiers. These technologies perform similar functions to cookies, such as identifying your device and remembering your preferences.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">3. How We Use Cookies</h2>
        <p className="mb-4">We use cookies and similar technologies for various purposes, including to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Enable you to sign in and authenticate your identity</li>
          <li>Remember your preferences and settings</li>
          <li>Maintain your session and keep you logged in as you navigate through the Service</li>
          <li>Improve the performance and reliability of the Service</li>
          <li>Analyze how you use the Service to help us improve it</li>
          <li>Personalize content and recommendations based on your preferences and usage patterns</li>
          <li>Deliver targeted advertising based on your interests</li>
          <li>Detect and prevent fraud and security issues</li>
          <li>Measure the effectiveness of our marketing campaigns</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">4. Types of Cookies We Use</h2>
        <p className="mb-4">We use the following types of cookies:</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.1 Essential Cookies</h3>
        <p className="mb-4">These cookies are necessary for the Service to function properly. They enable core functionality such as security, network management, and account authentication. You cannot opt out of these cookies as the Service would not function properly without them.</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.2 Functionality Cookies</h3>
        <p className="mb-4">These cookies enable us to remember your preferences and settings, such as language preferences, streaming quality settings, and whether you have already completed certain actions on the Service.</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.3 Performance and Analytics Cookies</h3>
        <p className="mb-4">These cookies collect information about how you use the Service, such as which pages you visit most frequently, whether you encounter any error messages, and how you navigate through the Service. They help us understand how users interact with the Service, which allows us to improve functionality and user experience.</p>
        
        <h3 className="text-lg font-semibold mb-2 text-white">4.4 Targeting and Advertising Cookies</h3>
        <p className="mb-4">These cookies are used to deliver advertisements that are more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and to help measure the effectiveness of advertising campaigns. They remember that you have visited a website and this information may be shared with other organizations, such as advertisers.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">5. Third-Party Cookies</h2>
        <p className="mb-4">Some cookies on our Service are set by third parties, such as our analytics and advertising partners. These third parties may use cookies, web beacons, and similar technologies to collect information about your use of our Service and other websites. This information may be used to, among other things, analyze and track data, determine the popularity of certain content, and better understand your online activity.</p>
        <p className="mb-4">We do not control these third parties' tracking technologies or how they may be used. If you have questions about an advertisement or other targeted content, you should contact the responsible third party directly.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">6. Your Cookie Choices</h2>
        <p className="mb-4">Most web browsers are set to accept cookies by default. If you prefer, you can usually set your browser to remove or reject cookies. Please note that if you choose to remove or reject cookies, this could affect the availability and functionality of our Service.</p>
        <p className="mb-4">Below are links to resources on how to manage cookies for common web browsers:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#a68dff] hover:text-[#7f00ff]">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-[#a68dff] hover:text-[#7f00ff]">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471" target="_blank" rel="noopener noreferrer" className="text-[#a68dff] hover:text-[#7f00ff]">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-[#a68dff] hover:text-[#7f00ff]">Microsoft Edge</a></li>
        </ul>
        <p className="mb-4">For mobile devices, you can manage your cookie preferences through the settings of your mobile device and mobile apps.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">7. Do Not Track Signals</h2>
        <p className="mb-4">Some browsers have a "Do Not Track" feature that signals to websites that you visit that you do not want to have your online activity tracked. Since there is currently no industry standard for recognizing and implementing "Do Not Track" signals, we do not currently respond to them. However, you can still manage your cookie preferences as described above.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">8. Updates to This Cookie Policy</h2>
        <p className="mb-4">We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We encourage you to review this Cookie Policy periodically to stay informed about our use of cookies and related technologies.</p>
        <p className="mb-4">The "Last Updated" date at the top of this Cookie Policy indicates when it was last revised.</p>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">9. Contact Us</h2>
        <p className="mb-4">If you have any questions about our use of cookies or this Cookie Policy, please contact us at:</p>
        <p className="mb-4">
          Email: <a href="mailto:privacy@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">privacy@veloplay.com</a><br />
          Address: 123 Sports Avenue, San Francisco, CA 94105, United States
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default CookiePolicy;