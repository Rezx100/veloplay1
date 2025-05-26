import React from 'react';
import CompanyPageLayout from '@/components/layout/CompanyPageLayout';

const Careers: React.FC = () => {
  const jobOpenings = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      department: "Engineering",
      location: "Remote",
      description: "We're looking for a Senior Frontend Developer to join our team and help build and improve our user interface. You'll be working with React, TypeScript, and modern frontend technologies to create engaging and responsive user experiences."
    },
    {
      id: 2,
      title: "Backend Engineer",
      department: "Engineering",
      location: "San Francisco, CA or Remote",
      description: "As a Backend Engineer, you'll be responsible for developing and maintaining the server-side logic of our platform. You'll work with Node.js, Express, and PostgreSQL to build scalable and reliable APIs and services."
    },
    {
      id: 3,
      title: "DevOps Engineer",
      department: "Infrastructure",
      location: "Remote",
      description: "Join our Infrastructure team as a DevOps Engineer to help us build and maintain our cloud infrastructure. You'll be working with AWS, Docker, and Kubernetes to ensure our platform is reliable, secure, and scalable."
    },
    {
      id: 4,
      title: "Product Manager",
      department: "Product",
      location: "New York, NY or Remote",
      description: "We're seeking a Product Manager to help shape the future of our platform. You'll work closely with engineering, design, and business teams to define and execute our product roadmap."
    },
    {
      id: 5,
      title: "Content Partnership Manager",
      department: "Business Development",
      location: "Los Angeles, CA",
      description: "As a Content Partnership Manager, you'll be responsible for building and maintaining relationships with sports leagues, teams, and content providers. You'll negotiate licensing deals and work to expand our content offerings."
    },
  ];

  return (
    <CompanyPageLayout 
      title="Careers" 
      description="Join the VeloPlay team and help shape the future of sports streaming. Explore our current openings and career opportunities."
    >
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Join Our Team</h2>
        <p className="text-white/90 mb-4">
          At VeloPlay, we're building the future of sports streaming, and we're looking for passionate, talented individuals to join our team. We offer a collaborative, innovative environment where you can make a real impact and grow your career.
        </p>
        <p className="text-white/90">
          We value diversity, creativity, and a growth mindset. Our team is fully remote-friendly, with team members working across multiple countries and time zones, united by our shared passion for sports and technology.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Why Join VeloPlay?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Impact-Driven Work</h3>
            <p className="text-white/90">
              Work on products that millions of sports fans use and love. Your contributions will directly impact user experiences worldwide.
            </p>
          </div>
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Growth & Learning</h3>
            <p className="text-white/90">
              We invest in your professional development with learning resources, conference stipends, and opportunities to work with cutting-edge technologies.
            </p>
          </div>
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Competitive Benefits</h3>
            <p className="text-white/90">
              Enjoy competitive compensation, equity options, healthcare benefits, flexible time off, and a remote-friendly work environment.
            </p>
          </div>
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            <h3 className="text-xl font-bold text-white mb-2">Team Culture</h3>
            <p className="text-white/90">
              Join a diverse, inclusive team that values collaboration, innovation, and work-life balance. Plus, free premium subscription to VeloPlay!
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-6">Current Openings</h2>
        <div className="space-y-6">
          {jobOpenings.map((job) => (
            <div key={job.id} className="bg-[#1a0533] rounded-lg border border-[#2f1a48] overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">{job.title}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-[#3b0764] text-white rounded-full">{job.department}</span>
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-[#2f1a48] text-white rounded-full">{job.location}</span>
                </div>
                <p className="text-white/90 mb-4">{job.description}</p>
                <button className="inline-flex items-center justify-center h-10 px-6 py-0 text-sm font-medium text-white transition-colors bg-[#7f00ff] hover:bg-[#6b00e6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#7f00ff] focus:ring-offset-2 focus:ring-offset-[#1a0533]">
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">Don't See a Perfect Fit?</h2>
        <p className="text-white/90 mb-6">
          We're always interested in connecting with talented individuals who are passionate about sports and technology. If you don't see a role that matches your skills and interests, please send your resume to <a href="mailto:careers@veloplay.com" className="text-[#a68dff] hover:text-[#7f00ff]">careers@veloplay.com</a> and tell us how you could contribute to the VeloPlay team.
        </p>
      </section>
    </CompanyPageLayout>
  );
};

export default Careers;