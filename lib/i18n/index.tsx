import React, { createContext, ReactNode, ReactElement } from 'react';
import { useSettings, Language } from '../../contexts/SettingsContext';
import { translations, Translations } from './translations';

export type TranslateFunction = (
  key: string,
  params?: Record<string, string | number>
) => any;

interface I18nContextType {
  t: TranslateFunction;
  language: Language;
}

const I18nContext = createContext<I18nContextType>({
  t: (key) => key as any,
  language: 'zh',
});

function getNestedTranslation(obj: any, key: string): any {
  return key.split('.').reduce((o, k) => o?.[k], obj);
}

function interpolate(template: any, params: Record<string, string | number> = {}): string {
  if (typeof template !== 'string') {
    return String(template);
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match;
  });
}

export function useTranslation(): I18nContextType {
  const { language } = useSettings();
  const t: TranslateFunction = (key, params) => {
    const translation = getNestedTranslation(translations[language], key as string);
    if (translation !== undefined && params) {
      return interpolate(translation, params);
    }
    return translation ?? key;
  };
  return { t, language };
}

export function I18nProvider({ children }: { children: ReactNode }): ReactElement {
  const { language } = useSettings();
  const t: TranslateFunction = (key, params) => {
    const translation = getNestedTranslation(translations[language], key as string);
    if (translation !== undefined && params) {
      return interpolate(translation, params);
    }
    return translation ?? key;
  };
  return React.createElement(
    I18nContext.Provider,
    { value: { t, language } },
    children
  );
}

export { translations, Translations };
