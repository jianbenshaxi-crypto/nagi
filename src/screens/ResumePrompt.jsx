import { useLocale } from '../i18n/LocaleContext.jsx';

export default function ResumePrompt({ onResume, onRestart, loading }) {
  const { t } = useLocale();
  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('resume.title')}</h2>
      <p className="lead">{t('resume.lead')}</p>
      <div className="btn-stack">
        <button className="btn btn-primary" onClick={onResume} disabled={loading}>
          {t('resume.resume')}
        </button>
        <button className="btn btn-secondary" onClick={onRestart} disabled={loading}>
          {t('resume.restart')}
        </button>
      </div>
    </div>
  );
}
