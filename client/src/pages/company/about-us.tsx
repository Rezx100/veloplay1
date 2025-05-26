import React from 'react';
import CompanyPageLayout from '@/components/layout/CompanyPageLayout';

const AboutUs: React.FC = () => {
  return (
    <CompanyPageLayout 
      title="About Us" 
      description="Learn about VeloPlay's mission, vision, and the team behind your favorite sports streaming platform."
    >
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Our Mission</h2>
        <p className="text-white/90 mb-4">
          At VeloPlay, our mission is to connect sports fans worldwide with the games they love, anywhere and anytime. We believe that passionate fans deserve access to high-quality, reliable streaming services that enhance their viewing experience and bring them closer to the action.
        </p>
        <p className="text-white/90">
          We strive to break down geographical barriers and make sports content accessible to fans around the globe, delivering an immersive and interactive viewing experience that celebrates the passion, dedication, and community that make sports so special.
        </p>
      </section>

      <div className="w-full h-64 bg-gradient-to-r from-[#1a0533] to-[#3b0764] rounded-xl mb-12 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">Bringing Sports to Fans Worldwide</h3>
          <p className="text-sm text-white/80 px-4">Delivering premium sports content to over 1 million fans across 190+ countries</p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Our Story</h2>
        <p className="text-white/90 mb-4">
          VeloPlay was founded in 2025 by a group of sports enthusiasts and technology experts who recognized the growing demand for accessible, high-quality sports streaming services. Frustrated by fragmented coverage, regional blackouts, and poor streaming quality, our founders set out to create a platform that would redefine how fans experience sports.
        </p>
        <p className="text-white/90 mb-4">
          What began as a small startup has quickly grown into a dynamic platform serving sports fans worldwide. Our team combines cutting-edge technology with a deep understanding of what sports fans need and value, creating an experience that puts fans first.
        </p>
        <p className="text-white/90">
          Today, VeloPlay offers comprehensive coverage of major sports leagues including the NBA, NFL, MLB, and NHL, with plans to expand our offerings in the coming years. We remain committed to our founding vision: making sports accessible to everyone, everywhere.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Fan-First Approach</h3>
            <p className="text-white/90">
              Everything we do is designed with fans in mind. We listen to our users' feedback and continuously improve our platform to meet their needs.
            </p>
          </div>
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Technical Excellence</h3>
            <p className="text-white/90">
              We are committed to providing the highest streaming quality, reliability, and performance using cutting-edge technology.
            </p>
          </div>
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Accessibility</h3>
            <p className="text-white/90">
              We believe sports should be accessible to everyone. We work to break down barriers and make content available across devices and locations.
            </p>
          </div>
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Integrity</h3>
            <p className="text-white/90">
              We operate with transparency and integrity in all aspects of our business, from our subscription models to our content partnerships.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Our Team</h2>
        <p className="text-white/90 mb-6">
          VeloPlay is powered by a diverse team of sports enthusiasts, technology experts, and business professionals united by our passion for sports and commitment to excellence. Our team members bring experience from leading technology companies, media organizations, and sports entities, creating a unique blend of skills and perspectives.
        </p>
        
        <p className="text-white/90">
          We're always looking for talented individuals who share our passion for sports and technology. Visit our <a href="/company/careers" className="text-[#a68dff] hover:text-[#7f00ff]">Careers page</a> to learn about opportunities to join our team.
        </p>
      </section>
    </CompanyPageLayout>
  );
};

export default AboutUs;