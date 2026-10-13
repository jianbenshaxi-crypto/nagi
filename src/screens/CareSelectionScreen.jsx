import { useLocale } from '../i18n/LocaleContext.jsx';
import { suggestNextAction, CARE_EMOJI } from '../lib/suggestNextAction.js';

const CARE_TYPES = [
  ...Object.keys(CARE_EMOJI).map((type) => ({ type, emoji: CARE_EMOJI[type] })),
  { type: 'journal', emoji: '📝' },
  { type: 'move', emoji: '🙆' },
];

export default function CareSelectionScreen({
  moodInput,
  moodScore,
  stressLevel,
  energyLevel,
  sleepLevel,
  crisis,
  onSelect,
  submitting,
}) {
  const { t } = useLocale();
  const suggested = suggestNextAction({ moodInput, moodScore, stressLevel, energyLevel, sleepLevel, crisis });

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('careSelection.title')}</h2>
      <p className="lead">{t('careSelection.lead')}</p>
      <div className="care-grid">
        {CARE_TYPES.map((option) => (
          <button
            key={option.type}
            className={`care-option${option.type === suggested.type ? ' suggested' : ''}`}
            onClick={() => onSelect(option.type)}
            disabled={submitting}
          >
            <span className="emoji">{option.emoji}</span>
            <span>
              <p className="title">
                {t(`careSelection.options.${option.type}.title`)}
                {option.type === suggested.type && <span className="badge">{t('careSelection.suggested')}</span>}
              </p>
              <p className="desc">{t(`careSelection.options.${option.type}.desc`)}</p>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
