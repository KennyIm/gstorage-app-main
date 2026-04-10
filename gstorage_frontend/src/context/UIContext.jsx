import React, { createContext, useState, useContext, useCallback } from 'react';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);
  const showToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const hideToast = () => setToast((prev) => ({ ...prev, show: false }));

  return (
    <UIContext.Provider value={{ isLoading, showLoader, hideLoader, toast, showToast, hideToast }}>
      {children}
    </UIContext.Provider>
  );
};