import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { MOOD_EMOJI } from '../components/MoodScale.jsx';
import { EXCESSIVE_LENGTH } from '../../shared/moderation.js';
import { computeTopCareType, computeWeeklyMoodMode } from '../lib/personalInsights.js';
import { createJournalEntry } from '../api/client.js';

const RANGE_DAYS = { week: 7, month: 30 };

function withinDays(entries, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter((e) => new Date(e.createdAt) >= cutoff);
}

// 「今週／今月の自分」を眺めて、「来週／来月の自分へ」一言だけ書き残す。評価も達成度の強調もしない。
export default function WeeklyReflectionScreen({ clientToken, history, onBack }) {
  const { t, locale } = useLocale();
  const [range, setRange] = useState('week');
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const days = RANGE_DAYS[range];
  const usageCount = withinDays(history ?? [], days).length;
  const topCareType = computeTopCareType(history, days);
  const moodMode = computeWeeklyMoodMode(history, days);
  const promptType = range === 'week' ? 'toNextWeekSelf' : 'toNextMonthSelf';
  const period = t(`weeklyReflection.period${range === 'week' ? 'Week' : 'Month'}`);

  function switchRange(next) {
    setRange(next);
    setDone(false);
    setValue('');
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const entry = await createJournalEntry(clientToken, promptType, value, locale);
      if (entry.flag === 'crisis') {
        setError(null);
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t(`weeklyReflection.${range}Title`)}</h2>
      <p className="lead">{t('weeklyReflection.lead')}</p>

      <div className="range-tabs">
        {Object.keys(RANGE_DAYS).map((key) => (
          <button
            key={key}
            type="button"
            className={`range-tab${range === key ? ' active' : ''}`}
            onClick={() => switchRange(key)}
          >
            {t(`trends.range${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className="settings-section">
        <p className="title">{t(`weeklyReflection.${range}SummaryTitle`)}</p>
        {usageCount > 0 ? (
          <p className="lead" style={{ marginBottom: 8 }}>{t('weeklyReflection.usageCount', { count: usageCount, period })}</p>
        ) : (
          <p className="hint">{t('weeklyReflection.noUsage', { period })}</p>
        )}
        {moodMode && (
          <p className="lead" style={{ marginBottom: 8 }}>
            {t('weeklyReflection.moodMode', { emoji: MOOD_EMOJI[moodMode.score], label: t(`moodScale.levels.${moodMode.score}`) })}
          </p>
        )}
        {topCareType && (
          <p className="lead">
            {t('trends.topCareType', { type: t(`trends.careTypeNoun.${topCareType.type}`), count: topCareType.count })}
          </p>
        )}
      </div>

      <div className="settings-section">
        <p className="title">{t(`weeklyReflection.${range}MessageTitle`)}</p>
        {done ? (
          <p className="lead">{t(`weeklyReflection.${range}SavedLead`)}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="lead">{t(`weeklyReflection.${range}MessageLead`)}</p>
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('weeklyReflection.placeholder')}
              maxLength={2000}
            />
            <p className="hint">{t('moodInput.hint', { count: value.trim().length, limit: EXCESSIVE_LENGTH })}</p>
            {error && <div className="error-box">{error}</div>}
            <div className="btn-stack">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? t('journal.submitting') : t('journal.submit')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onBack} disabled={submitting}>
                {t('afterCare.skip')}
              </button>
            </div>
          </form>
        )}
      </div>

      <button type="button" className="btn btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
        {t('common.back')}
      </button>
    </div>
  );
}
