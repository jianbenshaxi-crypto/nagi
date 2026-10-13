import { useLocale } from '../i18n/LocaleContext.jsx';

// 旧版NAGIのヘッダー（波紋のロゴ・NAGI 凪・タグライン・🌱 ○日目）
export default function BrandHeader({ journeyDay }) {
  const { t } = useLocale();

  return (
    <header className="brand-header">
      <div className="brand-mark">
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" className="brand-ripple">
          <circle cx="20" cy="20" r="4" fill="var(--accent)" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="var(--accent-light)" strokeWidth="2" opacity="0.55" />
          <circle cx="20" cy="20" r="18" fill="none" stroke="var(--accent-light)" strokeWidth="1.5" opacity="0.3" />
        </svg>
        <h1 className="brand-title">
          NAGI<span className="brand-kanji">凪</span>
        </h1>
      </div>
      <p className="brand-tagline">
        {t('common.tagline')}
        <br />
        <span className="brand-tagline-en">{t('header.findYourCalm')}</span>
      </p>
      {journeyDay && <span className="journey-badge">{t('home.journeyBadge', { n: journeyDay })}</span>}
    </header>
  );
}
