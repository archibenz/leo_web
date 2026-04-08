'use client';

import {useState, useRef, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';

type Language = {
  code: string;
  label: string;
  fullLabel: string;
  supported: boolean;
};

const languages: Language[] = [
  {code: 'ru', label: 'RU', fullLabel: 'Россия', supported: true},
  {code: 'en', label: 'EN', fullLabel: 'United Kingdom', supported: true},
  {code: 'uk', label: 'UK', fullLabel: 'Україна', supported: false},
  {code: 'kz', label: 'KZ', fullLabel: 'Қазақстан', supported: false},
  {code: 'tj', label: 'TJ', fullLabel: 'Тоҷикистон', supported: false},
  {code: 'uz', label: 'UZ', fullLabel: 'Oʻzbekiston', supported: false},
];

type FooterLanguageSelectProps = {
  currentLocale: string;
};

export default function FooterLanguageSelect({currentLocale}: FooterLanguageSelectProps) {
  const t = useTranslations('languageSelect');
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(currentLocale);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentLang = languages.find(l => l.code === selected) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (lang: Language) => {
    if (lang.supported) {
      const currentPath = window.location.pathname;
      const segments = currentPath.split('/');
      if (segments.length > 1) segments[1] = lang.code;
      const newPath = segments.join('/') || `/${lang.code}`;
      router.push(newPath);
    } else {
      localStorage.setItem('preferredLanguage', lang.code);
      setSelected(lang.code);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative z-[100]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[13px] text-[#F2E6D8]/40 transition-colors hover:text-[#F2E6D8]/70"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Globe icon */}
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="sm:hidden">{currentLang.label}</span>
        <span className="hidden sm:inline">{currentLang.fullLabel}</span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute bottom-full right-0 z-[110] mb-2 min-w-[160px] rounded-xl border border-[#F2E6D8]/[0.08] bg-[#1a0f0a] py-1.5 shadow-xl"
          style={{
            boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
          }}
        >
          {languages.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                onClick={() => handleSelect(lang)}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-[13px] transition hover:bg-white/5 ${
                  selected === lang.code ? 'text-[#D4A574]' : 'text-[#F2E6D8]/60'
                }`}
                role="option"
                aria-selected={selected === lang.code}
              >
                <span>{lang.fullLabel}</span>
                {!lang.supported && (
                  <span className="text-[10px] text-[#F2E6D8]/20 ml-2">{t('soon')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
