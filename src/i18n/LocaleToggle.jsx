import { useLocale } from './LocaleContext.jsx';

export default function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="locale-toggle" role="group" aria-label="Language / 言語">
      <button
        type="button"
        className={locale === 'ja' ? 'active' : ''}
        onClick={() => setLocale('ja')}
        aria-pressed={locale === 'ja'}
      >
        日本語
      </button>
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
