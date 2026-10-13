import { getCrisisSupportMessage } from '../../shared/moderation.js';
import { useLocale } from '../i18n/LocaleContext.jsx';

export default function CrisisScreen({ onContinueToCare, onEndForToday }) {
  const { t, locale } = useLocale();
  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('crisis.title')}</h2>
      <p className="lead">{getCrisisSupportMessage(locale)}</p>
      <div className="btn-stack">
        <button className="btn btn-primary" onClick={onContinueToCare}>
          {t('crisis.continue')}
        </button>
        <button className="btn btn-secondary" onClick={onEndForToday}>
          {t('crisis.end')}
        </button>
      </div>
    </div>
  );
}
