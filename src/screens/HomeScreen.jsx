import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { suggestNextAction, CARE_EMOJI } from '../lib/suggestNextAction.js';
import { computeTodayCondition } from '../lib/todayCondition.js';
import { computePersonalInsight, computeGreetingSignal } from '../lib/personalInsights.js';
import { getTimeOfDay } from '../lib/dailyPlan.js';
import { CONTEXT_TAGS } from '../../shared/tags.js';
import MoodScale, { MOOD_EMOJI } from '../components/MoodScale.jsx';
import BrandHeader from '../components/BrandHeader.jsx';

const EVENING_HOUR = 18;
const LEVELS = [1, 2, 3];
const LEVEL_LABEL_KEY = { 1: 'levelLow', 2: 'levelMid', 3: 'levelHigh' };
const SLEEP_LABEL_KEY = { 1: 'sleepLevelLow', 2: 'sleepLevelMid', 3: 'sleepLevelHigh' };

export default function HomeScreen({
  isReturning,
  alreadyCheckedInToday,
  daysSinceLastVisit,
  journeyDay,
  initialScore,
  initialTags,
  initialHighlight,
  initialStressLevel,
  initialEnergyLevel,
  initialSleepLevel,
  memoryEnabled,
  history,
  onMoodScore,
  onTags,
  onHighlight,
  onStressLevel,
  onEnergyLevel,
  onSleepLevel,
  onPickCare,
  onSeeAll,
  onWriteMore,
}) {
  const { t } = useLocale();
  const [score, setScore] = useState(initialScore ?? null);
  const [tags, setTags] = useState(initialTags ?? []);
  const [highlight, setHighlight] = useState(initialHighlight ?? '');
  const [stressLevel, setStressLevel] = useState(initialStressLevel ?? null);
  const [energyLevel, setEnergyLevel] = useState(initialEnergyLevel ?? null);
  const [sleepLevel, setSleepLevel] = useState(initialSleepLevel ?? null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isEvening = new Date().getHours() >= EVENING_HOUR;

  const DETAIL_FIELDS = [
    { key: 'stress', value: stressLevel, setValue: setStressLevel, onChange: onStressLevel, labelKey: 'home.stressLabel', levelKeys: LEVEL_LABEL_KEY },
    { key: 'energy', value: energyLevel, setValue: setEnergyLevel, onChange: onEnergyLevel, labelKey: 'home.energyLabel', levelKeys: LEVEL_LABEL_KEY },
    { key: 'sleep', value: sleepLevel, setValue: setSleepLevel, onChange: onSleepLevel, labelKey: 'home.sleepLabel', levelKeys: SLEEP_LABEL_KEY },
  ];

  function handleSelectScore(level) {
    setScore(level);
    onMoodScore(level); // 保存は裏側で進める。体験は待たせない
  }

  function handleDetailLevel(field, level) {
    const next = field.value === level ? null : level;
    field.setValue(next);
    field.onChange(next);
  }

  function toggleTag(tag) {
    const next = tags.includes(tag) ? tags.filter((t2) => t2 !== tag) : [...tags, tag];
    setTags(next);
    onTags(next);
  }

  function handleHighlightBlur() {
    if (highlight.trim() !== (initialHighlight ?? '').trim()) {
      onHighlight(highlight);
    }
  }

  const suggested = score ? suggestNextAction({ moodScore: score, stressLevel, energyLevel, sleepLevel }) : null;
  const suggestionText = suggested && t(suggested.reason ? `suggestions.reasons.${suggested.reason}` : `suggestions.${suggested.type}`);
  const conditionKey = score ? computeTodayCondition({ moodScore: score, stressLevel, energyLevel, sleepLevel }) : null;
  const timeOfDay = getTimeOfDay();
  const dailyPlanText = suggested ? t(`home.dailyPlan.${timeOfDay}`) : null;

  // 過去の履歴から「このケアは気分が軽くなりやすい」という傾向が見つかっていて、
  // それが今日の提案と同じケアの場合だけ、提案の理由に一言添える（NAGI MEMORYオン時のみ）。
  const personalInsight = memoryEnabled ? computePersonalInsight(history) : null;
  const suggestionPersonalNote =
    suggested && personalInsight?.kind === 'careTypeEffect' && personalInsight.careType === suggested.type
      ? t('home.suggestionPersonalNote', { type: t(`trends.careTypeNoun.${suggested.type}`) })
      : null;

  // 「あなたは疲れています」等と決めつけないよう、挨拶の切り替えは3種類の慎重な文言のみに限定する。
  const greetingSignal = isReturning ? computeGreetingSignal(history) : null;
  const greetingText = !isReturning
    ? t('home.firstGreeting')
    : greetingSignal === 'tired'
    ? t('home.greetingTired')
    : greetingSignal === 'breathingFan'
    ? t('home.greetingBreathingFan')
    : t('home.returningGreeting');

  return (
    <div className="screen-stack">
    <BrandHeader journeyDay={journeyDay} />
    <div className="card home-hero">
      <h2 className="section-title">{t('home.moodPrompt')}</h2>

      {/* 旧版NAGIの「今の状態」：選んだ気分を丸の中に大きく表示する */}
      <div className="home-today">
        <div className="home-today-mood" aria-hidden="true">
          {score ? MOOD_EMOJI[score] : '🌊'}
        </div>
        <div className="home-today-body">
          <p className="home-today-title">{score ? t(`moodScale.levels.${score}`) : t('home.todayTitleDefault')}</p>
          <p className="home-today-greeting">{greetingText}</p>
        </div>
      </div>

      {typeof daysSinceLastVisit === 'number' && daysSinceLastVisit >= 1 && (
        <p className="hint">{t('home.lastVisitDaysAgo', { days: daysSinceLastVisit })}</p>
      )}
      {alreadyCheckedInToday && !score && <p className="hint">{t('home.alreadyCheckedIn')}</p>}

      <MoodScale value={score} onSelect={handleSelectScore} />

      {score && (
        <div className="tag-section">
          <button type="button" className="btn btn-ghost" style={{ padding: '4px 0' }} onClick={() => setDetailsOpen((o) => !o)}>
            {t('home.detailsToggle')}
          </button>
          {detailsOpen && (
            <div style={{ marginTop: 8 }}>
              {DETAIL_FIELDS.map((field) => (
                <div key={field.key}>
                  <p className="hint" style={{ margin: '0 0 6px' }}>{t(field.labelKey)}</p>
                  <div className="tag-picker" style={{ marginBottom: 12 }}>
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`tag-chip${field.value === level ? ' active' : ''}`}
                        onClick={() => handleDetailLevel(field, level)}
                        aria-pressed={field.value === level}
                      >
                        {t(`home.${field.levelKeys[level]}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {conditionKey && (
        <p className="today-condition">{t(`home.condition.${conditionKey}`)}</p>
      )}

      {suggested && (
        <div className="suggestion-card">
          <p className="suggestion-title">{t('home.suggestionTitle')}</p>
          {dailyPlanText && <p className="hint" style={{ margin: '0 0 10px' }}>{dailyPlanText}</p>}
          <p className="suggestion-body">
            <span aria-hidden="true">{CARE_EMOJI[suggested.type]}</span> {suggestionText}
          </p>
          {suggestionPersonalNote && <p className="hint" style={{ margin: '-8px 0 16px' }}>{suggestionPersonalNote}</p>}
          <button className="btn btn-primary" onClick={() => onPickCare(suggested.type)}>
            {t('home.suggestionCta')}
          </button>
        </div>
      )}

      {score && memoryEnabled && (
        <div className="tag-section">
          <p className="hint" style={{ margin: '0 0 8px' }}>
            {t('home.tagsPrompt')}
          </p>
          <div className="tag-picker">
            {CONTEXT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-chip${tags.includes(tag) ? ' active' : ''}`}
                onClick={() => toggleTag(tag)}
                aria-pressed={tags.includes(tag)}
              >
                {t(`tags.${tag}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isEvening && (
        <div className="tag-section">
          <label className="hint" htmlFor="home-highlight" style={{ display: 'block', margin: '0 0 8px' }}>
            {t('home.highlightPrompt')}
          </label>
          <input
            id="home-highlight"
            type="text"
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            onBlur={handleHighlightBlur}
            placeholder={t('home.highlightPlaceholder')}
            maxLength={100}
          />
        </div>
      )}

      <div className="btn-stack" style={{ marginTop: score ? 12 : 24 }}>
        <button className="btn btn-ghost" onClick={onWriteMore}>
          {t('home.writeMore')}
        </button>
        {score && (
          <button className="btn btn-ghost" onClick={onSeeAll}>
            {t('home.seeAll')}
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
