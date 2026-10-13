import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';

const STEP_OPTIONS = ['water', 'study5', 'prepareTomorrow', 'putPhoneDown', 'sleepNow', 'doNothing'];

// 「今日の小さな一歩」。達成を強調せず、選ぶだけで完了する。「何もしない」も対等な選択肢。
export default function EndScreen({ onComplete, onBackHome }) {
  const { t } = useLocale();
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function selectStep(key) {
    setSubmitting(true);
    await onComplete(t(`end.steps.${key}`));
    setSubmitting(false);
    setDone(true);
  }

  async function submitCustom(e) {
    e.preventDefault();
    setSubmitting(true);
    await onComplete(customText.trim());
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>

      {done ? (
        <>
          <h2>{t('end.doneTitle')}</h2>
          <p className="lead">{t('end.doneLead')}</p>
          <button className="btn btn-ghost" onClick={onBackHome}>
            {t('end.backHome')}
          </button>
        </>
      ) : (
        <>
          <h2>{t('end.title')}</h2>
          <p className="lead">{t('end.lead')}</p>

          {showCustom ? (
            <form onSubmit={submitCustom}>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t('end.placeholder')}
                maxLength={200}
                autoFocus
              />
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? t('end.submitting') : t('end.submit')}
              </button>
            </form>
          ) : (
            <div className="care-grid">
              {STEP_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="care-option"
                  onClick={() => selectStep(key)}
                  disabled={submitting}
                >
                  <span>
                    <p className="title">{t(`end.steps.${key}`)}</p>
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowCustom((s) => !s)}
            disabled={submitting}
            style={{ marginTop: 8 }}
          >
            {showCustom ? t('end.chooseInstead') : t('end.writeInstead')}
          </button>
        </>
      )}
    </div>
  );
}
