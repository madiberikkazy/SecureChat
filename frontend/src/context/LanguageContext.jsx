import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from '../i18n/index'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') || 'kz'
  )

  const setLang = useCallback((code) => {
    localStorage.setItem('lang', code)
    setLangState(code)
  }, [])

  // t('key') — аударма жолын қайтарады
  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['kz']?.[key] ?? key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
