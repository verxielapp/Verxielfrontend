import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import tr from '../locales/tr';
import en from '../locales/en';
import de from '../locales/de';
import fr from '../locales/fr';

const LanguageContext = createContext();

const languages = {
  tr: { name: 'Türkçe', flag: '🇹🇷', locale: tr },
  en: { name: 'English', flag: '🇺🇸', locale: en },
  de: { name: 'Deutsch', flag: '🇩🇪', locale: de },
  fr: { name: 'Français', flag: '🇫🇷', locale: fr }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // localStorage'dan dil tercihini al, yoksa tarayıcı dilini kullan
    const saved = localStorage.getItem('language');
    if (saved && languages[saved]) {
      return saved;
    }
    
    // Tarayıcı dilini kontrol et
    const browserLang = navigator.language.split('-')[0];
    if (languages[browserLang]) {
      return browserLang;
    }
    
    // Varsayılan olarak İngilizce
    return 'en';
  });

  const t = useMemo(() => languages[currentLanguage].locale, [currentLanguage]);

  useEffect(() => {
    localStorage.setItem('language', currentLanguage);
  }, [currentLanguage]);

  const changeLanguage = (langCode) => {
    if (languages[langCode]) {
      setCurrentLanguage(langCode);
    }
  };

  const getCurrentLanguageInfo = () => languages[currentLanguage];

  const getAllLanguages = () => languages;

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    getCurrentLanguageInfo,
    getAllLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
