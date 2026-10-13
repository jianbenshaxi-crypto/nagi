import { useState } from 'react';
import { evaluateMoodInput, EXCESSIVE_LENGTH } from '../../shared/moderation.js';
import { useLocale } from '../i18n/LocaleContext.jsx';

export default function MoodInputScreen({ onSubmit, submitting }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const { t, locale } = useLocale();

  function handleSubmit(e) {
    e.preventDefault();
    const result = evaluateMoodInput(value, locale);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    onSubmit(result);
  }

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('moodInput.title')}</h2>
      <p className="lead">{t('moodInput.lead')}</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('moodInput.placeholder')}
          maxLength={2000}
        />
        <p className="hint">{t('moodInput.hint', { count: value.trim().length, limit: EXCESSIVE_LENGTH })}</p>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? t('moodInput.submitting') : t('moodInput.next')}
        </button>
      </form>
    </div>
  );
}
