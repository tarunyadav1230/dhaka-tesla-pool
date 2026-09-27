'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LangCode, TranslationKey, LANGUAGES, t as translate } from './i18n';

interface LangContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LangContext = createContext<LangContextType | null>(null);
const LANG_KEY = 'dtp_lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as LangCode | null;
    if (saved && LANGUAGES.find(l => l.code === saved)) {
      applyLang(saved);
    }
  }, []);

  function applyLang(code: LangCode) {
    const info = LANGUAGES.find(l => l.code === code);
    setLangState(code);
    localStorage.setItem(LANG_KEY, code);
    // Apply RTL to document
    document.documentElement.dir  = info?.rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
  }

  const isRTL = LANGUAGES.find(l => l.code === lang)?.rtl ?? false;

  return (
    <LangContext.Provider value={{
      lang,
      setLang: applyLang,
      t: (key) => translate(lang, key),
      isRTL,
    }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
