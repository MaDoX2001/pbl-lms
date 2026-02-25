import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AppSettingsContext = createContext(null);

const getInitialLanguage = () => localStorage.getItem('app_language') || 'ar';
const getInitialMode = () => localStorage.getItem('app_mode') || 'light';

export const AppSettingsProvider = ({ children }) => {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [mode, setMode] = useState(getInitialMode);

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }, [language, direction]);

  useEffect(() => {
    localStorage.setItem('app_mode', mode);
  }, [mode]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(
    () => ({
      language,
      mode,
      direction,
      setLanguage,
      setMode,
      toggleLanguage,
      toggleMode,
    }),
    [language, mode, direction]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};
