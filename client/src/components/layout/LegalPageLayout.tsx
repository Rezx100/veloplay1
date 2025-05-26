import React from 'react';
import { Helmet } from 'react-helmet';

interface LegalPageLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ 
  children, 
  title, 
  description 
}) => {
  return (
    <>
      <Helmet>
        <title>{title} | VeloPlay</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto bg-[#120525] border border-[#2f1a48] rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">{title}</h1>
          <div className="prose prose-invert prose-purple max-w-none">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalPageLayout;