import { translations } from './translations';

const getCurrentLanguage = () => {
  if (typeof window === 'undefined') return 'ar';
  return localStorage.getItem('app_language') || 'ar';
};

export const translate = (key, params = {}) => {
  const language = getCurrentLanguage();
  const dictionary = translations[language] || translations.ar;
  const fallback = translations.ar;

  let template = dictionary[key] ?? fallback[key] ?? key;

  Object.entries(params).forEach(([paramKey, paramValue]) => {
    template = template.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
  });

  return template;
};
