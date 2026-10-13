import { useLocale } from '../i18n/LocaleContext.jsx';

const LEVELS = [1, 2, 3, 4, 5];
// 見分けやすさを優先し、表情が離れている定番の絵文字にする（似た表情を並べない）
export const MOOD_EMOJI = { 1: '😢', 2: '😟', 3: '😴', 4: '😐', 5: '😊' };

export default function MoodScale({ value, onSelect, disabled }) {
  const { t } = useLocale();

  return (
    <div className="mood-scale" role="group" aria-label={t('home.moodPrompt')}>
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          className={`mood-scale-item${value === level ? ' active' : ''}`}
          onClick={() => onSelect(level)}
          disabled={disabled}
          aria-pressed={value === level}
        >
          <span className="mood-scale-emoji" aria-hidden="true">{MOOD_EMOJI[level]}</span>
          <span className="mood-scale-label">{t(`moodScale.levels.${level}`)}</span>
        </button>
      ))}
    </div>
  );
}
