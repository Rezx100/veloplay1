import React from 'react';
import CompanyPageLayout from '@/components/layout/CompanyPageLayout';

const Press: React.FC = () => {
  const pressReleases = [
    {
      id: 1,
      title: "VeloPlay Launches New Platform for Live Sports Streaming",
      date: "May 10, 2025",
      excerpt: "VeloPlay announces the launch of its cutting-edge sports streaming platform, offering fans unprecedented access to live games across major leagues including the NBA, NFL, MLB, and NHL.",
      url: "#"
    },
    {
      id: 2,
      title: "VeloPlay Secures $30 Million in Series A Funding",
      date: "April 5, 2025",
      excerpt: "Sports streaming platform VeloPlay has raised $30 million in Series A funding led by Benchmark, with participation from Accel and several sports figures, to accelerate growth and expand content offerings.",
      url: "#"
    },
    {
      id: 3,
      title: "VeloPlay Partners with Major Sports Leagues to Enhance Streaming Experience",
      date: "March 15, 2025",
      excerpt: "VeloPlay has announced strategic partnerships with major sports leagues to offer enhanced streaming features, including multi-angle viewing, real-time statistics, and interactive fan experiences.",
      url: "#"
    },
    {
      id: 4,
      title: "VeloPlay Introduces Innovative AI-Powered Game Highlights",
      date: "February 21, 2025",
      excerpt: "VeloPlay has unveiled a new AI-powered feature that automatically generates personalized game highlights for users, allowing fans to catch up on missed games with customized highlight reels.",
      url: "#"
    },
    {
      id: 5,
      title: "VeloPlay Expands to International Markets",
      date: "January 10, 2025",
      excerpt: "VeloPlay announces expansion into European and Asian markets, bringing its premium sports streaming service to fans worldwide with localized content and language support.",
      url: "#"
    }
  ];

  const mediaContacts = [
    {
      name: "Sarah Johnson",
      title: "Media Relations",
      email: "media@veloplay.com",
      phone: "+1 (555) 123-4567"
    },
    {
      name: "Michael Chen",
      title: "Investor Relations",
      email: "investors@veloplay.com",
      phone: "+1 (555) 987-6543"
    }
  ];

  return (
    <CompanyPageLayout 
      title="Press" 
      description="VeloPlay press releases, media resources, and contact information. Get the latest news about VeloPlay sports streaming platform."
    >
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Press Releases</h2>
        <div className="space-y-6">
          {pressReleases.map((release) => (
            <div key={release.id} className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
              <span className="text-sm text-[#a68dff] block mb-2">{release.date}</span>
              <h3 className="text-xl font-bold text-white mb-2">{release.title}</h3>
              <p className="text-white/90 mb-4">{release.excerpt}</p>
              <a 
                href={release.url} 
                className="inline-flex items-center text-[#a68dff] hover:text-[#7f00ff]"
              >
                Read More
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Media Kit</h2>
        <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
          <p className="text-white/90 mb-4">
            Our media kit includes logos, brand guidelines, product images, executive headshots, and company information for media use. Please download our media kit for accurate representation of VeloPlay in your coverage.
          </p>
          <button className="inline-flex items-center justify-center h-10 px-6 py-0 text-sm font-medium text-white transition-colors bg-[#7f00ff] hover:bg-[#6b00e6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#7f00ff] focus:ring-offset-2 focus:ring-offset-[#1a0533]">
            Download Media Kit
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Media Contacts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mediaContacts.map((contact, index) => (
            <div key={index} className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
              <h3 className="text-xl font-bold text-white mb-1">{contact.name}</h3>
              <p className="text-[#a68dff] mb-3">{contact.title}</p>
              <div className="space-y-2">
                <p className="text-white/90">
                  <span className="inline-block w-16">Email:</span>
                  <a href={`mailto:${contact.email}`} className="text-[#a68dff] hover:text-[#7f00ff]">{contact.email}</a>
                </p>
                <p className="text-white/90">
                  <span className="inline-block w-16">Phone:</span>
                  <a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="text-[#a68dff] hover:text-[#7f00ff]">{contact.phone}</a>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Interview Requests</h2>
        <p className="text-white/90 mb-4">
          For media interview requests with VeloPlay executives or experts, please contact our media relations team at <a href="mailto:media@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">media@veloplay.com</a>. Please include details about your publication, the topic you wish to discuss, and your timeline.
        </p>
      </section>
    </CompanyPageLayout>
  );
};

export default Press;