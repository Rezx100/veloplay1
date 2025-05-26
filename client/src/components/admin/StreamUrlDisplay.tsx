import React, { useState, useEffect } from 'react';

// Constants
const OLD_DOMAIN = 'vp.pixelsport.to';
const NEW_DOMAIN = 'vpt.pixelsport.to';

interface StreamUrlDisplayProps {
  url: string;
  className?: string;
}

/**
 * A component that displays stream URLs with the updated domain
 */
const StreamUrlDisplay: React.FC<StreamUrlDisplayProps> = ({ url, className = '' }) => {
  const [displayUrl, setDisplayUrl] = useState(url);

  useEffect(() => {
    // Update the URL if it uses the old domain
    if (url && url.includes(OLD_DOMAIN)) {
      const updatedUrl = url.replace(OLD_DOMAIN, NEW_DOMAIN);
      setDisplayUrl(updatedUrl);
    } else {
      setDisplayUrl(url);
    }
  }, [url]);

  return (
    <span className={className}>
      {displayUrl}
    </span>
  );
};

export default StreamUrlDisplay;