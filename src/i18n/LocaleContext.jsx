import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DICTIONARIES, LOCALES, DEFAULT_LOCALE } from './dictionaries.js';

const STORAGE_KEY = 'nagi_locale';
const LocaleContext = createContext(null);

function detectInitialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(saved)) return saved;
  } catch {
    /* localStorage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav?.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

function resolve(dict, path) {
  return path.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), dict);
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(detectInitialLocale);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next) {
    if (!LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable */
    }
  }

  const value = useMemo(() => {
    const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
    function t(key, vars) {
      const found = resolve(dict, key);
      if (found === undefined) return key;
      return typeof found === 'string' ? interpolate(found, vars) : found;
    }
    return { locale, setLocale, t };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
