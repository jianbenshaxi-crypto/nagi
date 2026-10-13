import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import {
  computePersonalInsight,
  computeTopCareType,
  computeDayOverDayMood,
  computeMoodCalendarMonth,
} from '../lib/personalInsights.js';
import { isSameLocalDay } from '../lib/dateUtils.js';
import { MOOD_EMOJI } from '../components/MoodScale.jsx';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const RANGE_DAYS = { today: 1, week: 7, month: 30 };
const WIDTH = 320;
const HEIGHT = 90;
const LEVEL_FIELDS = [
  { field: 'stressLevel', labelKey: 'home.stressLabel', levelKeys: { 1: 'levelLow', 2: 'levelMid', 3: 'levelHigh' } },
  { field: 'energyLevel', labelKey: 'home.energyLabel', levelKeys: { 1: 'levelLow', 2: 'levelMid', 3: 'levelHigh' } },
  { field: 'sleepLevel', labelKey: 'home.sleepLabel', levelKeys: { 1: 'sleepLevelLow', 2: 'sleepLevelMid', 3: 'sleepLevelHigh' } },
];

function withinRange(entries, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter((e) => new Date(e.createdAt) >= cutoff);
}

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function variance(values) {
  const m = mean(values);
  return mean(values.map((v) => (v - m) ** 2));
}

// 「傾向があります」「関連が見られます」等、慎重な言い方だけを使う。断定はしない。
function computeInsightKey(entries) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recent = sorted.slice(-7).map((e) => e.moodScore);
  const previous = sorted.slice(-14, -7).map((e) => e.moodScore);

  const recentAvg = mean(recent);
  if (previous.length > 0 && recentAvg - mean(previous) >= 0.6) return 'insightImproving';
  if (variance(recent) >= 1.5) return 'insightVolatile';
  if (recentAvg <= 2.4) return 'insightLow';
  return 'insightSteady';
}

function sparklinePoints(entries) {
  if (entries.length === 0) return '';
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const first = new Date(sorted[0].createdAt).getTime();
  const last = new Date(sorted[sorted.length - 1].createdAt).getTime();
  const span = Math.max(1, last - first);

  return sorted
    .map((e) => {
      const x = ((new Date(e.createdAt).getTime() - first) / span) * WIDTH;
      const y = HEIGHT - ((e.moodScore - 1) / 4) * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function averageLevel(entries, field) {
  const values = entries.map((e) => e[field]).filter((v) => typeof v === 'number');
  if (values.length === 0) return null;
  return Math.round(mean(values));
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const INSIGHT_TEXT_KEY = {
  tag: null,
  timeOfDay: 'trends.eveningStress',
  sleepLag: 'trends.sleepLagStress',
  careTypeEffect: null,
  checkInFrequency: 'trends.checkInFrequencyInsight',
};

function personalInsightText(t, insight) {
  if (insight.kind === 'tag') return t(`personalInsights.${insight.tag}.${insight.direction}`);
  if (insight.kind === 'careTypeEffect') {
    return t('trends.careTypeEffect', { type: t(`trends.careTypeNoun.${insight.careType}`) });
  }
  return t(INSIGHT_TEXT_KEY[insight.kind]);
}

export default function TrendsScreen({ history, memoryEnabled, journalCount = 0, onOpenWeeklyReflection }) {
  const { t, locale } = useLocale();
  const [range, setRange] = useState('week');
  const [monthOffset, setMonthOffset] = useState(0);

  const entries = withinRange(history ?? [], RANGE_DAYS[range]);
  const insightKey = computeInsightKey(entries);
  const personalInsight = memoryEnabled ? computePersonalInsight(history) : null;
  const careUsageCount = withinRange(history ?? [], 7).length;
  const topCareType = computeTopCareType(history);
  const dayOverDay = computeDayOverDayMood(history);

  const viewMonth = new Date();
  viewMonth.setDate(1);
  viewMonth.setMonth(viewMonth.getMonth() + monthOffset);
  const moodCalendar = computeMoodCalendarMonth(history, viewMonth);
  const hasMoodMapData = moodCalendar.some((d) => d.inMonth && d.score !== null);
  const monthLabel = new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ja', {
    year: 'numeric',
    month: 'long',
  }).format(viewMonth);

  const todayEntries = (history ?? [])
    .filter((h) => typeof h.moodScore === 'number' && isSameLocalDay(new Date(h.createdAt), new Date()))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('trends.title')}</h2>
      <p className="lead">{t('trends.lead')}</p>

      <div className="range-tabs">
        {Object.keys(RANGE_DAYS).map((key) => (
          <button
            key={key}
            type="button"
            className={`range-tab${range === key ? ' active' : ''}`}
            onClick={() => setRange(key)}
          >
            {t(`trends.range${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="lead">{t('trends.empty')}</p>
      ) : (
        <>
          <svg className="trend-sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT}>
            <polyline
              points={sparklinePoints(entries)}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {insightKey && (
            <p className="lead" style={{ marginTop: 8 }}>
              {t(`trends.${insightKey}`)}
              <br />
              <span className="hint">{t('trends.insightNote')}</span>
            </p>
          )}

          <div className="level-stats">
            {LEVEL_FIELDS.map(({ field, labelKey, levelKeys }) => {
              const avg = averageLevel(entries, field);
              return (
                <div key={field} className="level-stat">
                  <p className="level-stat-label">{t(labelKey)}</p>
                  <p className="level-stat-value">{avg ? t(`home.${levelKeys[avg]}`) : '—'}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="settings-section">
        <p className="title">{t('trends.moodMapTitle')}</p>
        <div className="mood-calendar-nav">
          <button type="button" className="mood-calendar-nav-btn" onClick={() => setMonthOffset((o) => o - 1)}>
            {t('trends.prevMonth')}
          </button>
          <span className="mood-calendar-month">{monthLabel}</span>
          <button
            type="button"
            className="mood-calendar-nav-btn"
            onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
            disabled={monthOffset >= 0}
          >
            {t('trends.nextMonth')}
          </button>
        </div>
        <div className="mood-calendar-weekdays">
          {WEEKDAY_KEYS.map((key) => (
            <span key={key}>{t(`trends.weekdayShort.${key}`)}</span>
          ))}
        </div>
        <div className="mood-calendar">
          {moodCalendar.map(({ date, score, inMonth }) => (
            <span
              key={date.toISOString()}
              className={`mood-calendar-cell${inMonth ? '' : ' outside'}`}
              title={inMonth ? `${date.getMonth() + 1}/${date.getDate()}` : undefined}
              aria-hidden="true"
            >
              {inMonth ? (score ? MOOD_EMOJI[score] : '・') : ''}
            </span>
          ))}
        </div>
        {hasMoodMapData ? (
          <p className="hint" style={{ marginTop: 8 }}>{t('trends.moodMapHint')}</p>
        ) : (
          <p className="hint" style={{ marginTop: 8 }}>{t('trends.moodMapEmpty')}</p>
        )}
      </div>

      {todayEntries.length >= 2 && (
        <div className="settings-section">
          <p className="title">{t('trends.timelineTitle')}</p>
          <div className="emotion-timeline">
            {todayEntries.map((e) => (
              <div key={e.id} className="emotion-timeline-item">
                <span className="emotion-timeline-time">{formatTime(e.createdAt)}</span>
                <span aria-hidden="true">{MOOD_EMOJI[e.moodScore]}</span>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>{t('trends.timelineHint')}</p>
        </div>
      )}

      <div className="settings-section">
        <p className="title">{t('trends.guideTitle')}</p>
        {dayOverDay && <p className="lead" style={{ marginBottom: 8 }}>{t(`trends.dayOverDay${dayOverDay === 'lighter' ? 'Lighter' : 'Heavier'}`)}</p>}
        {topCareType && (
          <p className="lead" style={{ marginBottom: 8 }}>
            {t('trends.topCareType', { type: t(`trends.careTypeNoun.${topCareType.type}`), count: topCareType.count })}
          </p>
        )}
        {careUsageCount > 0 && <p className="hint">{t('trends.usageCount', { count: careUsageCount })}</p>}
        {journalCount > 0 && <p className="hint">{t('trends.journalCount', { count: journalCount })}</p>}
        {!dayOverDay && !topCareType && careUsageCount === 0 && journalCount === 0 && (
          <p className="lead">{t('trends.empty')}</p>
        )}
        {onOpenWeeklyReflection && (
          <button type="button" className="btn btn-ghost" onClick={onOpenWeeklyReflection} style={{ marginTop: 12 }}>
            {t('trends.openWeeklyReflection')}
          </button>
        )}
      </div>

      <div className="settings-section">
        <p className="title">{t('trends.personalTitle')}</p>
        {!memoryEnabled && <p className="lead">{t('trends.personalDisabled')}</p>}
        {memoryEnabled && !personalInsight && <p className="lead">{t('trends.personalNotEnough')}</p>}
        {memoryEnabled && personalInsight && (
          <p className="lead">
            {personalInsightText(t, personalInsight)}
            <br />
            <span className="hint">{t('trends.insightNote')}</span>
          </p>
        )}
      </div>
    </div>
  );
}
