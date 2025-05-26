import React from 'react';
import LegalPageLayout from '@/components/layout/LegalPageLayout';

const Dmca: React.FC = () => {
  return (
    <LegalPageLayout 
      title="DMCA Policy" 
      description="VeloPlay DMCA Policy - learn about our process for handling copyright infringement claims."
    >
      <p className="text-lg mb-4">Last Updated: May 14, 2025</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">1. Introduction</h2>
        <p className="mb-4">VeloPlay respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond expeditiously to claims of copyright infringement that are reported to our designated copyright agent.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">2. Notification of Claimed Copyright Infringement</h2>
        <p className="mb-4">If you are a copyright owner, or authorized to act on behalf of one, and you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, please submit your claim via email to <a href="mailto:dmca@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">dmca@veloplay.com</a>, with the subject line: "DMCA Takedown Request."</p>
        <p className="mb-4">You must include in your notification the following:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>An electronic or physical signature of the copyright owner or a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
          <li>Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works at a single online site are covered by a single notification, a representative list of such works at that site.</li>
          <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material.</li>
          <li>Information reasonably sufficient to permit us to contact the complaining party, such as an address, telephone number, and, if available, an email address at which the complaining party may be contacted.</li>
          <li>A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
          <li>A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">3. Counter-Notification</h2>
        <p className="mb-4">If you believe that your content that was removed (or to which access was disabled) is not infringing, or that you have the authorization from the copyright owner, the copyright owner's agent, or pursuant to the law, to post and use the material in your content, you may send a counter-notification to our copyright agent at <a href="mailto:dmca@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">dmca@veloplay.com</a> containing the following information:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Your physical or electronic signature.</li>
          <li>Identification of the content that has been removed or to which access has been disabled and the location at which the content appeared before it was removed or disabled.</li>
          <li>A statement that you have a good faith belief that the content was removed or disabled as a result of mistake or a misidentification of the content.</li>
          <li>Your name, address, telephone number, and email address, and a statement that you consent to the jurisdiction of the federal court in [Jurisdiction] and a statement that you will accept service of process from the person who provided notification of the alleged infringement.</li>
        </ul>
        <p className="mb-4">If a counter-notification is received by our copyright agent, we may send a copy of the counter-notification to the original complaining party informing that person that we may replace the removed content or cease disabling it. Unless the copyright owner files an action seeking a court order against the content provider, member or user, the removed content may be replaced or access to it restored after 10 business days or more after receipt of the counter-notice, at our sole discretion.</p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">4. Repeat Infringer Policy</h2>
        <p className="mb-4">In accordance with the DMCA and other applicable law, VeloPlay has adopted a policy of terminating, in appropriate circumstances and at our sole discretion, users who are deemed to be repeat infringers. We may also at our sole discretion limit access to our website and/or terminate the accounts of any users who infringe any intellectual property rights of others, whether or not there is any repeat infringement.</p>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4 text-[#a68dff]">5. Contact Information</h2>
        <p className="mb-4">If you have any questions about our DMCA policy, please contact us at: <a href="mailto:dmca@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">dmca@veloplay.com</a></p>
      </section>
    </LegalPageLayout>
  );
};

export default Dmca;