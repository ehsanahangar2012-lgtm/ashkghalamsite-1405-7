import { useState, useEffect } from 'react';

export const useNetworkCheck = (testUrl: string = 'https://www.google.com/favicon.ico') => {
  const [hasInternationalAccess, setHasInternationalAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const checkAccess = () => {
      const img = new Image();
      let timeoutId: NodeJS.Timeout;

      img.onload = () => {
        if (isMounted) setHasInternationalAccess(true);
        clearTimeout(timeoutId);
      };

      img.onerror = () => {
        if (isMounted) setHasInternationalAccess(false);
        clearTimeout(timeoutId);
      };

      // Set a timeout in case the request just hangs (common in restricted intranets)
      timeoutId = setTimeout(() => {
        img.src = ''; // Cancel image load
        if (isMounted) setHasInternationalAccess(false);
      }, 3000); // 3 seconds timeout

      // Cache buster to prevent cached results
      img.src = `${testUrl}?_cb=${new Date().getTime()}`;
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [testUrl]);

  return hasInternationalAccess;
};
