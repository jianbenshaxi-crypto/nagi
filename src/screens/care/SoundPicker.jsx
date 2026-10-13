import { useLocale } from '../../i18n/LocaleContext.jsx';
import { SOUND_IDS, SOUND_EMOJI, MAX_ACTIVE_SOUNDS, TIMER_MINUTES } from './useNatureSoundEngine.js';

function formatRemaining(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  return totalMinutes;
}

// 自然音のチップ選択＋個別音量調整＋タイマーのUI。NatureSoundCareと呼吸+自然音の
// 統合ケアの両方で使う（見た目をここに一本化し、2箇所で食い違わないようにする）。
export default function SoundPicker({
  activeTypes,
  volumes,
  unsupported,
  toggleSound,
  setVolume,
  stopAll,
  timerMinutes,
  timerRemainingMs,
  setSleepTimer,
  suggestedType,
}) {
  const { t } = useLocale();

  if (unsupported) {
    return <p className="lead">{t('natureSound.unsupported')}</p>;
  }

  const atLimit = activeTypes.length >= MAX_ACTIVE_SOUNDS;

  return (
    <>
      {suggestedType && !activeTypes.includes(suggestedType) && (
        <p className="hint" style={{ margin: '0 0 8px' }}>
          {t('natureSound.suggestedHint', { type: t(`natureSound.types.${suggestedType}`) })}
        </p>
      )}
      <div className="sound-picker">
        {SOUND_IDS.map((id) => {
          const active = activeTypes.includes(id);
          const suggested = !active && id === suggestedType;
          return (
            <button
              key={id}
              type="button"
              className={`sound-chip${active ? ' active' : ''}${suggested ? ' suggested' : ''}`}
              onClick={() => toggleSound(id)}
              disabled={!active && atLimit}
              aria-pressed={active}
            >
              <span className="emoji">{SOUND_EMOJI[id]}</span>
              <span>{t(`natureSound.types.${id}`)}</span>
            </button>
          );
        })}
      </div>

      {activeTypes.length > 0 && (
        <>
          {atLimit && <p className="hint">{t('natureSound.limitHint', { max: MAX_ACTIVE_SOUNDS })}</p>}
          <div className="sound-volumes">
            {activeTypes.map((id) => (
              <div key={id} className="sound-volume-row">
                <span className="emoji" aria-hidden="true">{SOUND_EMOJI[id]}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumes[id] ?? 0.5}
                  onChange={(e) => setVolume(id, Number(e.target.value))}
                  aria-label={t(`natureSound.types.${id}`)}
                />
              </div>
            ))}
          </div>

          <p className="hint" style={{ margin: '0 0 8px' }}>{t('natureSound.timerPrompt')}</p>
          <div className="range-tabs" style={{ marginBottom: 16 }}>
            {TIMER_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                className={`range-tab${timerMinutes === m ? ' active' : m === 1 ? ' featured' : ''}`}
                onClick={() => setSleepTimer(timerMinutes === m ? null : m)}
                aria-pressed={timerMinutes === m}
              >
                {t('natureSound.timerMinutes', { count: m })}
              </button>
            ))}
          </div>
          {timerMinutes && timerRemainingMs != null && (
            <p className="hint">{t('natureSound.timerRemaining', { minutes: formatRemaining(timerRemainingMs) })}</p>
          )}

          <button className="btn btn-ghost" onClick={() => stopAll()}>
            {t('natureSound.stop')}
          </button>
        </>
      )}
    </>
  );
}
