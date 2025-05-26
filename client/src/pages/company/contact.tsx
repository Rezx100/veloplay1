import React from 'react';
import { useState } from 'react';
import CompanyPageLayout from '@/components/layout/CompanyPageLayout';
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  HelpCircle, 
  Briefcase, 
  AlertCircle 
} from 'lucide-react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    reason: 'general'
  });
  
  const [submitted, setSubmitted] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send this data to your backend
    console.log('Form submitted:', formData);
    // Show the success message
    setSubmitted(true);
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      reason: 'general'
    });
  };

  const contactOptions = [
    {
      icon: <MessageSquare className="h-8 w-8 text-[#a68dff]" />,
      title: "General Inquiries",
      description: "For general questions about VeloPlay services.",
      contact: "support@veloplay.com"
    },
    {
      icon: <HelpCircle className="h-8 w-8 text-[#a68dff]" />,
      title: "Technical Support",
      description: "Having issues with your subscription or streams?",
      contact: "help@veloplay.com"
    },
    {
      icon: <Briefcase className="h-8 w-8 text-[#a68dff]" />,
      title: "Business & Partnerships",
      description: "For business opportunities and partnerships.",
      contact: "business@veloplay.com"
    },
    {
      icon: <AlertCircle className="h-8 w-8 text-[#a68dff]" />,
      title: "Report Issues",
      description: "Report content or technical issues with streams.",
      contact: "report@veloplay.com"
    }
  ];

  return (
    <CompanyPageLayout 
      title="Contact Us" 
      description="Get in touch with the VeloPlay team. We're here to help with your questions, suggestions, and support needs."
    >
      <section className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-[#a68dff] mb-6">Get In Touch</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-[#a68dff] mt-1 mr-3" />
                <div>
                  <h3 className="text-white font-medium">Email</h3>
                  <p className="text-white/80">support@veloplay.com</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-[#a68dff] mt-1 mr-3" />
                <div>
                  <h3 className="text-white font-medium">Phone</h3>
                  <p className="text-white/80">+1 (555) 123-4567</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-[#a68dff] mt-1 mr-3" />
                <div>
                  <h3 className="text-white font-medium">Location</h3>
                  <p className="text-white/80">
                    123 Sports Avenue<br />
                    San Francisco, CA 94105<br />
                    United States
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Office Hours</h3>
              <p className="text-white/80 mb-2">Monday - Friday: 9:00 AM - 6:00 PM (ET)</p>
              <p className="text-white/80">Weekend support available for premium subscribers</p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Connect With Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="h-10 w-10 rounded-full bg-[#2f1a48] flex items-center justify-center text-white hover:bg-[#3b0764] transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-[#2f1a48] flex items-center justify-center text-white hover:bg-[#3b0764] transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-[#2f1a48] flex items-center justify-center text-white hover:bg-[#3b0764] transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-[#2f1a48] flex items-center justify-center text-white hover:bg-[#3b0764] transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48]">
            {submitted ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#a68dff] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">Message Received!</h3>
                <p className="text-white/80 mb-6">Thanks for reaching out. We'll get back to you shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center h-10 px-6 py-0 text-sm font-medium text-white transition-colors bg-[#7f00ff] hover:bg-[#6b00e6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#7f00ff] focus:ring-offset-2 focus:ring-offset-[#1a0533]"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-white font-medium mb-1">Your Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-[#2f1a48] border border-[#3b0764] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7f00ff]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-white font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-[#2f1a48] border border-[#3b0764] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7f00ff]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="reason" className="block text-white font-medium mb-1">Reason for Contact</label>
                    <select
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-[#2f1a48] border border-[#3b0764] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7f00ff]"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="business">Business Opportunity</option>
                      <option value="report">Report an Issue</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-white font-medium mb-1">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-[#2f1a48] border border-[#3b0764] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7f00ff]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-white font-medium mb-1">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-2 bg-[#2f1a48] border border-[#3b0764] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7f00ff]"
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center w-full h-12 px-6 py-0 text-sm font-medium text-white transition-colors bg-[#7f00ff] hover:bg-[#6b00e6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#7f00ff] focus:ring-offset-2 focus:ring-offset-[#1a0533]"
                  >
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#a68dff] mb-6">Contact Departments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactOptions.map((option, index) => (
            <div key={index} className="bg-[#1a0533] p-6 rounded-lg border border-[#2f1a48] text-center">
              <div className="flex justify-center mb-4">
                {option.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{option.title}</h3>
              <p className="text-white/80 mb-3 text-sm">{option.description}</p>
              <a href={`mailto:${option.contact}`} className="text-[#a68dff] hover:text-[#7f00ff] text-sm font-medium">
                {option.contact}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[#a68dff] mb-4">FAQ</h2>
        <p className="text-white/90 mb-4">
          For quick answers to common questions, please visit our <a href="#" className="text-[#a68dff] hover:text-[#7f00ff]">FAQ page</a>. If you can't find what you're looking for, don't hesitate to contact us using the form above.
        </p>
      </section>
    </CompanyPageLayout>
  );
};

export default Contact;